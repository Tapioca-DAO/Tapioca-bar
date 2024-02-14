import { BigNumberish, Signature, Wallet } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getSingularityContract } from './utils';
import inquirer from 'inquirer';

import TapiocaOFTArtifact from '@tapioca-sdk/artifacts/tapiocaz/TapiocaOFT.json';
import { TapiocaOFT__factory } from '@tapioca-sdk/typechain/TapiocaZ/factories/tOFT/TapiocaOFT__factory';
import { TContract } from '@tapioca-sdk//shared';
import { Singularity, USDO__factory } from '../typechain';
import { BaseTOFT } from '@tapioca-sdk/typechain/TapiocaZ/TapiocaOFT';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { splitSignature } from 'ethers/lib/utils';
import MagnetarV2Artifacts from '@tapioca-sdk/artifacts/tapioca-periphery/MagnetarV2.json';
import ERC20MockArtifacts from '@tapioca-sdk/artifacts/tapioca-mocks/ERC20Mock.json';
import { ERC20Mock } from '@tapioca-sdk/typechain/tapioca-mocks/ERC20Mock';
import { MagnetarV2 } from '@tapioca-sdk/typechain/tapioca-periphery/Magnetar/MagnetarV2';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';

export const testCrossChainBorrow__task = async (
    {},
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
    const toft__from__dep = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            TAPIOCA_PROJECTS_NAME.TapiocaZ,
            fromChain.chainId,
        )
        .find((e) => e.meta.isToftHost === true);
    if (!toft__from__dep)
        throw new Error(`[-] No TOFT found for chain ${fromChain.name}`);

    const toftFrom = TapiocaOFTMock__factory.attach(toft__from__dep.address);

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
                e.toLowerCase().includes(toft__from__dep.name.toLowerCase()),
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
    const collateralToDeposit = hre.ethers.utils.parseEther(
        (
            await inquirer.prompt({
                type: 'input',
                message: 'Collateral to deposit:',
                name: 'collateralToDeposit',
            })
        ).collateralToDeposit,
    );
    const borrowAmount = hre.ethers.utils.parseEther(
        (
            await inquirer.prompt({
                type: 'input',
                message: 'Amount to borrow:',
                name: 'borrowAmount',
            })
        ).borrowAmount,
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

    const permitLendAmount = hre.ethers.constants.MaxUint256;
    const permitLend = await getSGLPermitSignature(
        hre,
        'Permit',
        toNetwork,
        singularity,
        magnetar.address,
        permitLendAmount,
        deadline,
        {
            nonce: (await singularity.nonces(deployer.address)).add(1),
        },
    );
    const permitLendStruct: BaseTOFT.IApprovalStruct = {
        deadline,
        permitBorrow: false,
        owner: deployer.address,
        spender: magnetar.address,
        value: permitLendAmount,
        r: permitLend.r,
        s: permitLend.s,
        v: permitLend.v,
        target: singularity.address,
    };

    // ---------------------------------- Prepare borrow OP ----------------------------------

    const withdrawFees = (
        await usdoTo.estimateSendFee(
            fromChain.lzChainId,
            '0x'.concat(deployer.address.split('0x')[1].padStart(64, '0')),
            borrowAmount,
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

    const erc20 = (await hre.ethers.getContractAtFromArtifact(
        ERC20MockArtifacts,
        await toftFrom.erc20(),
    )) as ERC20Mock;

    // check allowance
    if (
        (await erc20.allowance(deployer.address, toftFrom.address)).lt(
            collateralToDeposit,
        )
    ) {
        console.log('[+] Free minting');
        await (
            await erc20.freeMint(
                hre.ethers.BigNumber.from(100).mul((10e18).toString()),
            )
        ).wait(3);
        console.log('[+] Approving ERC20 wrap');
        (
            await erc20.approve(
                toftFrom.address,
                hre.ethers.constants.MaxUint256,
            )
        ).wait(3);
    }

    // Wrap
    console.log('[+] Wrapping');
    await (
        await toftFrom.wrap(
            deployer.address,
            deployer.address,
            collateralToDeposit,
        )
    ).wait(3);

    // ---------------------------------- Execute borrow OP ----------------------------------

    const call = toftFrom.interface.encodeFunctionData('sendToYBAndBorrow', [
        deployer.address,
        deployer.address,
        toChain.lzChainId,
        airdropAdapterParams,
        {
            amount: collateralToDeposit,
            borrowAmount,
            marketHelper: magnetar.address,
            market: singularity.address,
        },
        {
            withdraw: true,
            withdrawAdapterParams: hre.ethers.utils.solidityPack(
                ['uint16', 'uint256'],
                [1, 200000],
            ),
            withdrawLzChainId: fromChain.lzChainId,
            withdrawLzFeeAmount: withdrawFees,
            withdrawOnOtherChain: true,
        },
        {
            extraGasLimit: 1_000_000,
            zroPaymentAddress: deployer.address,
        },
        [permitBorrowStruct, permitLendStruct],
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
        await toftFrom.sendToYBAndBorrow(
            deployer.address,
            deployer.address,
            toChain.lzChainId,
            airdropAdapterParams,
            {
                amount: collateralToDeposit,
                borrowAmount,
                marketHelper: magnetar.address,
                market: singularity.address,
            },
            {
                withdraw: true,
                withdrawAdapterParams: hre.ethers.utils.solidityPack(
                    ['uint16', 'uint256'],
                    [1, 200000],
                ),
                withdrawLzChainId: fromChain.lzChainId,
                withdrawLzFeeAmount: withdrawFees,
                withdrawOnOtherChain: true,
            },
            {
                extraGasLimit: 1_000_000,
                zroPaymentAddress: deployer.address,
            },
            [permitBorrowStruct, permitLendStruct],
            { value: callFee.add(withdrawFees) },
        )
    ).wait();
    console.log(`[+] Borrow Tx ${tx.transactionHash}`);
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
