import { BigNumberish, Signature, Wallet } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getSingularityContract } from './utils';
import inquirer from 'inquirer';

import TapiocaOFTMockArtifact from '../gitsub_tapioca-sdk/src/artifacts/tapiocaz/contracts/mocks/TapiocaOFTMock.sol/TapiocaOFTMock.json';
import { TapiocaOFTMock__factory } from '../gitsub_tapioca-sdk/src/typechain/TapiocaZ/factories/mocks/TapiocaOFTMock__factory';
import { TContract } from 'tapioca-sdk/dist/shared';
import { Singularity, USDO__factory } from '../typechain';
import { BaseTOFT } from '../gitsub_tapioca-sdk/src/typechain/TapiocaZ/mocks/TapiocaOFTMock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { splitSignature } from 'ethers/lib/utils';

export const testCrossChainBorrow__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const deployer = (await hre.ethers.getSigners())[0];
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'global');
    // Setup chain info
    const fromChain = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    const toChain = hre.SDK.utils.getChainBy('name', 'arbitrum_goerli');

    if (!fromChain) throw new Error('[-] From chain not supported');
    if (!toChain) throw new Error('[-] arbitrum_goerli not found');
    if (fromChain.name === toChain.name)
        throw new Error('[-] From can not be arbitrum_goerli');

    const toNetwork = await hre.SDK.hardhatUtils.useNetwork(hre, toChain.name);

    // ---------------------------------- Load contracts ----------------------------------

    const TapiocaOFTMock__factory = (
        (await hre.ethers.getContractFactoryFromArtifact(
            TapiocaOFTMockArtifact,
        )) as TapiocaOFTMock__factory
    ).connect(deployer);

    // Load TOFT on fromChain
    const toft__from__dep = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapiocaz', fromChain.chainId)
        .find((e) => e.meta.isToftHost === true);
    if (!toft__from__dep)
        throw new Error(`[-] No TOFT found for chain ${fromChain.name}`);

    const toftFrom = TapiocaOFTMock__factory.attach(toft__from__dep.address);

    // Load USDO on fromChain
    const usdo__from__dep = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-bar', fromChain.chainId)
        .find((e) => e.name.toLowerCase().includes('usdo'));

    if (!usdo__from__dep)
        throw new Error(`[-] No USDO found for chain ${toChain.name}`);

    const usdoFrom = USDO__factory.connect(usdo__from__dep.address, deployer);

    // Load USDO on toChain
    const usdo__to__dep = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-bar', toChain.chainId)
        .find((e) => e.name.toLowerCase().includes('usdo'));

    if (!usdo__to__dep)
        throw new Error(`[-] No USDO found for chain ${toChain.name}`);

    const usdoTo = USDO__factory.connect(usdo__to__dep.address, toNetwork);

    // Load Singularity toChain
    const localDeployments = hre.SDK.db.loadLocalDeployment(
        tag,
        toChain.chainId,
    );
    const choices = localDeployments
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

    const sgl__dep = localDeployments.find(
        (e) => e.name === contractName,
    ) as TContract;
    if (!sgl__dep) throw new Error(`[-] No contract found for ${contractName}`);

    const singularity = (
        await hre.ethers.getContractAt('Singularity', sgl__dep.address)
    ).connect(toNetwork);

    // Load market helper
    const marketsHelper__dep = localDeployments.find(
        (e) => (e.name = 'MarketsHelper'),
    );
    if (!marketsHelper__dep) throw new Error('[-] No MarketsHelper found');
    const marketsHelper = await hre.ethers.getContractAt(
        'MarketsHelper',
        marketsHelper__dep.address,
    );

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
        (await hre.ethers.provider.getBlock('latest')).timestamp + 30_000,
    );

    const permitBorrowAmount = hre.ethers.constants.MaxUint256;
    const permitBorrow = await getSGLPermitSignature(
        hre,
        'PermitBorrow',
        deployer,
        singularity,
        marketsHelper.address,
        permitBorrowAmount,
        deadline,
    );
    const permitBorrowStruct: BaseTOFT.IApprovalStruct = {
        deadline,
        permitBorrow: true,
        owner: deployer.address,
        spender: marketsHelper.address,
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
        deployer,
        singularity,
        marketsHelper.address,
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
        spender: marketsHelper.address,
        value: permitLendAmount,
        r: permitLend.r,
        s: permitLend.s,
        v: permitLend.v,
        target: singularity.address,
    };

    // ---------------------------------- Prepare borrow OP ----------------------------------

    const withdrawFees = await usdoTo.estimateSendFee(
        2,
        hre.ethers.utils
            .solidityPack(['address'], [deployer.address])
            .padEnd(66, '0'),
        borrowAmount,
        false,
        '0x',
    );

    const airdropAdapterParams = hre.ethers.utils.solidityPack(
        ['uint16', 'uint', 'uint', 'address'],
        [
            2, //it needs to be 2
            1_000_000, //extra gas limit; min 200k
            withdrawFees.nativeFee, //amount of eth to airdrop
            marketsHelper.address,
        ],
    );

    // ---------------------------------- Execute borrow OP ----------------------------------

    const tx = await (
        await toftFrom.sendToYBAndBorrow(
            deployer.address,
            deployer.address,
            toChain.lzChainId,
            airdropAdapterParams,
            {
                amount: collateralToDeposit,
                borrowAmount,
                marketHelper: marketsHelper.address,
                market: singularity.address,
            },
            {
                withdrawAdapterParams: '0x00',
                withdrawLzChainId: fromChain.lzChainId,
                withdrawLzFeeAmount: withdrawFees.nativeFee,
                withdrawOnOtherChain: true,
            },
            {
                extraGasLimit: 1_000_000,
                strategyDeposit: false,
                wrap: false,
                zroPaymentAddress: deployer.address,
            },
            [permitBorrowStruct, permitLendStruct],
            { value: hre.ethers.utils.parseEther('10') },
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
                owner: wallet.address,
                spender,
                value,
                nonce,
                deadline,
            },
        ),
    );
}
