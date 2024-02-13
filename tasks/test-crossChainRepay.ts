import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { MagnetarV2 } from '@tapioca-sdk//typechain/tapioca-periphery';
import TapiocaOFTArtifact from '@tapioca-sdk/artifacts/tapiocaz/TapiocaOFT.json';

import { TContract } from '@tapioca-sdk//shared';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import MagnetarV2Artifacts from '@tapioca-sdk/artifacts/tapioca-periphery/MagnetarV2.json';
import { TapiocaOFT__factory } from '@tapioca-sdk/typechain/TapiocaZ/factories/tOFT/TapiocaOFT__factory';
import { TapiocaOFT } from '@tapioca-sdk/typechain/TapiocaZ/tOFT/TapiocaOFT';
import TapiocaOFTArtifacts from '@tapioca-sdk/artifacts/tapiocaz/TapiocaOFT.json';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Wallet, BigNumberish, Signature } from 'ethers';
import { splitSignature } from 'ethers/lib/utils';
import { BaseTOFT } from '@tapioca-sdk/typechain/TapiocaZ/TapiocaOFT';
import { Singularity } from '../typechain';

export const crossChainRepay__task = async (
    taskArgs: {
        bbMarket: string;
        sglMarket: string;
        magnetarAddress: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    const deployer = (await hre.ethers.getSigners())[0];
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'global');
    // Setup chain info
    const fromChain = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    const toChain = hre.SDK.utils.getChainBy('name', 'arbitrum_goerli');

    if (!fromChain) throw new Error('[-] From chain not supported');
    if (!toChain) throw new Error('[-] arbitrum_goerli not found');
    if (fromChain.name === toChain.name)
        throw new Error('[-] From can not be arbitrum_goerli');

    const toNetwork = await hre.SDK.hardhatUtils.useNetwork(hre, toChain.name);

    // ---------------------------------- Load contracts ----------------------------------

    const TapiocaOFTMock__factory = (
        (await hre.ethers.getContractFactoryFromArtifact(
            TapiocaOFTArtifact,
        )) as TapiocaOFT__factory
    ).connect(deployer) as TapiocaOFT__factory;

    // Load TOFT on fromChain
    const globalTOFTs_from_deployments = hre.SDK.db.loadGlobalDeployment(
        tag,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        fromChain.chainId,
    );
    const tOFT_from_choices = globalTOFTs_from_deployments
        .map((e) => e.name)
        .filter((e) => e.startsWith('TapiocaOFT'));
    const { toft_from_contract_name } = await inquirer.prompt({
        type: 'list',
        name: 'toft_from_contract_name',
        message: 'Choose a TOFT contract:',
        choices: tOFT_from_choices,
    });
    const toft__dep = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            TAPIOCA_PROJECTS_NAME.TapiocaZ,
            fromChain.chainId,
        )
        .find((e) => e.name == toft_from_contract_name);
    if (!toft__dep)
        throw new Error(`[-] No TOFT found for chain ${fromChain.name}`);

    const toftFrom = TapiocaOFTMock__factory.attach(toft__dep.address);
    console.log(`tOFT from ${toftFrom.address}`);

    // Load TOFT on toChain
    const toft__to__dep = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            TAPIOCA_PROJECTS_NAME.TapiocaZ,
            toChain.chainId,
        )
        .find((e) => e.name == toft_from_contract_name);

    if (!toft__to__dep)
        throw new Error(`[-] No TOFT found for chain ${toChain.name}`);

    const toftTo = await hre.ethers.getContractAtFromArtifact(
        TapiocaOFTArtifacts,
        toft__to__dep.address,
        toNetwork,
    );
    console.log(`tOFT to ${toftTo.address}`);

    // Load USDO on fromChain
    const usdo__from__dep = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            TAPIOCA_PROJECTS_NAME.TapiocaBar,
            fromChain.chainId,
        )
        .find((e) => e.name.toLowerCase() === 'usdo');

    if (!usdo__from__dep)
        throw new Error(`[-] No USDO found for chain ${toChain.name}`);

    const usdoFrom = await hre.ethers.getContractAt(
        'USDO',
        usdo__from__dep.address,
    );
    console.log(`USDO from ${usdoFrom.address}`);

    // Load USDO on toChain
    const usdo__to__dep = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            TAPIOCA_PROJECTS_NAME.TapiocaBar,
            toChain.chainId,
        )
        .find((e) => e.name.toLowerCase() === 'usdo');

    if (!usdo__to__dep)
        throw new Error(`[-] No USDO found for chain ${toChain.name}`);

    const usdoTo = await hre.ethers.getContractAt(
        'USDO',
        usdo__to__dep.address,
        toNetwork,
    );
    console.log(`USDO to ${usdoTo.address}`);

    // Load Singularity toChain
    const globalToDeployments = hre.SDK.db.loadGlobalDeployment(
        tag,
        TAPIOCA_PROJECTS_NAME.TapiocaBar,
        toChain.chainId,
    );
    const choices = globalToDeployments
        .map((e) => e.name)
        .filter(
            (e) =>
                e.toLowerCase().includes('singularity') &&
                e.toLowerCase().includes(toft__dep.name.toLowerCase()),
        );

    const { contractName } = await inquirer.prompt({
        type: 'list',
        name: 'contractName',
        message: 'Choose a singularity contract:',
        choices,
    });

    const sgl__dep = globalToDeployments.find(
        (e) => e.name === contractName,
    ) as TContract;
    if (!sgl__dep) throw new Error(`[-] No contract found for ${contractName}`);

    const singularity = (
        await hre.ethers.getContractAt('Singularity', sgl__dep.address)
    ).connect(toNetwork);

    // Load Magnetar
    const magnetar__dep = hre.SDK.db.getGlobalDeployment(
        TAPIOCA_PROJECTS_NAME.Generic,
        fromChain.chainId,
        'Magnetar',
    );
    if (!magnetar__dep) throw new Error('[-] No Magnetar found');
    const magnetar = (await hre.ethers.getContractAtFromArtifact(
        MagnetarV2Artifacts,
        magnetar__dep.address,
    )) as MagnetarV2;

    // ---------------------------------- Ask for values ----------------------------------
    const repayAmount = hre.ethers.utils.parseEther(
        (
            await inquirer.prompt({
                type: 'input',
                message: 'Amount to repay:',
                name: 'repayAmount',
            })
        ).repayAmount,
    );

    // ------------------- Permit Setup -------------------
    const deadline = hre.ethers.BigNumber.from(
        (await toNetwork.provider.getBlock('latest')).timestamp + 18000000,
    );

    const permitBorrowAmount = hre.ethers.constants.MaxUint256;
    const permitBorrow = await getSGLPermitSignature(
        hre,
        'PermitBorrow',
        toNetwork,
        singularity,
        magnetar.address,
        permitBorrowAmount,
        deadline,
    );

    const permitBorrowStruct: BaseTOFT.IApprovalStruct = {
        deadline,
        permitBorrow: true,
        owner: deployer.address,
        spender: magnetar.address,
        value: permitBorrowAmount,
        r: permitBorrow.r,
        s: permitBorrow.s,
        v: permitBorrow.v,
        target: singularity.address,
    };

    const collateralToWithdraw = 10000000;
    const withdrawFees = (
        await toftTo.estimateSendFee(
            fromChain.lzChainId,
            '0x'.concat(deployer.address.split('0x')[1].padStart(64, '0')),
            collateralToWithdraw,
            false,
            hre.ethers.utils.solidityPack(['uint16', 'uint256'], [1, 200000]),
        )
    ).nativeFee;
    console.log(
        '[+] Withdraw fees',
        hre.ethers.utils.formatEther(withdrawFees),
    );

    const airdropAdapterParams = hre.ethers.utils.solidityPack(
        ['uint16', 'uint', 'uint', 'address'],
        [
            2, //it needs to be 2
            1_000_000, //extra gas limit; min 200k
            withdrawFees, //amount of eth to airdrop
            magnetar.address,
        ],
    );

    // ---------------------------------- Prepare repay OP ----------------------------------

    // Change for each scenario
    // Repay + withdraw + send collateral cross chain
    // Repay
    // Withdraw collateral + send collateral cross chain
    const call = usdoFrom.interface.encodeFunctionData('sendAndLendOrRepay', [
        deployer.address,
        deployer.address,
        toChain.lzChainId,
        {
            repay: true,
            amount: repayAmount,
            marketHelper: magnetar.address,
            market: singularity.address,
            removeCollateral: false,
            removeCollateralShare: 0,
        },
        {
            extraGasLimit: 1_000_000,
            zroPaymentAddress: deployer.address,
        },
        [permitBorrowStruct],
        {
            withdraw: false,
            withdrawLzFeeAmount: withdrawFees,
            withdrawOnOtherChain: false,
            withdrawLzChainId: fromChain.lzChainId,
            withdrawAdapterParams: hre.ethers.utils.solidityPack(
                ['uint16', 'uint256'],
                [1, 200000],
            ),
        },
        airdropAdapterParams,
    ]);

    const lz = await hre.ethers.getContractAt(
        'ILayerZeroEndpoint',
        await toftFrom.lzEndpoint(),
    );
    const callFee = (
        await lz.estimateFees(
            toChain.lzChainId,
            toftFrom.address,
            call,
            false,
            airdropAdapterParams,
        )
    ).nativeFee;

    console.log(`[+] Call fee: ${hre.ethers.utils.formatEther(callFee)} Ether`);

    const tx = await (
        await usdoFrom.sendAndLendOrRepay(
            deployer.address,
            deployer.address,
            toChain.lzChainId,
            {
                repay: true,
                amount: repayAmount,
                marketHelper: magnetar.address,
                market: singularity.address,
                removeCollateral: false,
                removeCollateralShare: 0,
            },
            {
                extraGasLimit: 2_000_000,
                zroPaymentAddress: deployer.address,
            },
            [],
            {
                withdraw: false,
                withdrawLzFeeAmount: withdrawFees,
                withdrawOnOtherChain: false,
                withdrawLzChainId: fromChain.lzChainId,
                withdrawAdapterParams: hre.ethers.utils.solidityPack(
                    ['uint16', 'uint256'],
                    [1, 1_000_000],
                ),
            },
            hre.ethers.utils.solidityPack(
                ['uint16', 'uint256'],
                [1, 1_000_000],
            ),
            // airdropAdapterParams,
            { value: callFee.add(withdrawFees).mul(3) },
        )
    ).wait();
    console.log(`[+] Repay Tx ${tx.transactionHash}`);

    console.log('\n[+] Done');
};

async function getSGLPermitSignature(
    hre: HardhatRuntimeEnvironment,
    type: 'Permit' | 'PermitBorrow',
    wallet: Wallet | SignerWithAddress,
    token: Singularity,
    spender: string,
    value: BigNumberish = hre.ethers.constants.MaxUint256,
    deadline: BigNumberish = hre.ethers.constants.MaxUint256,
    permitConfig?: {
        nonce?: BigNumberish;
        name?: string;
        chainId?: number;
        version?: string;
    },
): Promise<Signature> {
    const [nonce, _, version, chainId] = await Promise.all([
        permitConfig?.nonce ?? token.nonces(wallet.address),
        permitConfig?.name ?? token.name(),
        permitConfig?.version ?? '1',
        permitConfig?.chainId ?? wallet.getChainId(),
    ]);

    const permit = [
        {
            name: 'actionType',
            type: 'uint16',
        },
        {
            name: 'owner',
            type: 'address',
        },
        {
            name: 'spender',
            type: 'address',
        },
        {
            name: 'value',
            type: 'uint256',
        },
        {
            name: 'nonce',
            type: 'uint256',
        },
        {
            name: 'deadline',
            type: 'uint256',
        },
    ];

    return splitSignature(
        await wallet._signTypedData(
            {
                name: 'Tapioca Singularity',
                version,
                chainId,
                verifyingContract: token.address,
            },
            type === 'Permit' ? { Permit: permit } : { PermitBorrow: permit },
            {
                actionType: 0,
                owner: wallet.address,
                spender,
                value,
                nonce,
                deadline,
            },
        ),
    );
}
