import { BigNumberish, Signature, Wallet } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { splitSignature } from 'ethers/lib/utils';
import { TContract } from '@tapioca-sdk//shared';
import { BaseTOFT } from '@tapioca-sdk/typechain/TapiocaZ/mocks/TapiocaOFTMock';
import { Singularity } from '../typechain';

export const testCrossChainLend__task = async (
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

    // Load USDO on fromChain
    const usdo__from__dep = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-bar', fromChain.chainId)
        .find((e) => e.name.toLowerCase() === 'usdo');

    if (!usdo__from__dep)
        throw new Error(`[-] No USDO found for chain ${toChain.name}`);

    const usdoFrom = await hre.ethers.getContractAt(
        'USDO',
        usdo__from__dep.address,
    );

    // Load USDO on toChain
    const usdo__to__dep = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-bar', toChain.chainId)
        .find((e) => e.name.toLowerCase() === 'usdo');

    if (!usdo__to__dep)
        throw new Error(`[-] No USDO found for chain ${toChain.name}`);

    const usdoTo = await hre.ethers.getContractAt(
        'USDO',
        usdo__to__dep.address,
        toNetwork,
    );

    // Load Singularity toChain
    const localToDeployments = hre.SDK.db.loadLocalDeployment(
        tag,
        toChain.chainId,
    );
    const choices = localToDeployments
        .map((e) => e.name)
        .filter((e) => e.toLowerCase().includes('singularity'));

    const { contractName } = await inquirer.prompt({
        type: 'list',
        name: 'contractName',
        message: 'Choose a singularity contract:',
        choices,
    });

    const sgl__dep = localToDeployments.find(
        (e) => e.name === contractName,
    ) as TContract;
    if (!sgl__dep) throw new Error(`[-] No contract found for ${contractName}`);

    const singularity = (
        await hre.ethers.getContractAt('Singularity', sgl__dep.address)
    ).connect(toNetwork);

    // Load market helper
    const marketsHelper__dep = localToDeployments.find(
        (e) => e.name.toLowerCase() === 'marketshelper',
    );
    if (!marketsHelper__dep) throw new Error('[-] No MarketsHelper found');
    const marketsHelper = await hre.ethers.getContractAt(
        'MarketsHelper',
        marketsHelper__dep.address,
    );

    // ---------------------------------- Ask for values ----------------------------------
    const amountToLend = hre.ethers.utils.parseEther(
        (
            await inquirer.prompt({
                type: 'input',
                message: 'Amount to lend:',
                name: 'amountToLend',
            })
        ).amountToLend,
    );

    // ------------------- Permit Setup -------------------
    const deadline = hre.ethers.BigNumber.from(
        (await toNetwork.provider.getBlock('latest')).timestamp + 18000000,
    );

    const permitLendAmount = hre.ethers.constants.MaxUint256;
    const permitLend = await getSGLPermitSignature(
        hre,
        'Permit',
        toNetwork,
        singularity,
        marketsHelper.address,
        permitLendAmount,
        deadline,
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
    // check allowance
    if ((await usdoFrom.balanceOf(deployer.address)).lt(amountToLend)) {
        console.log('[+] Free minting');
        await usdoFrom.freeMint(amountToLend);
    }

    // ---------------------------------- Execute borrow OP ----------------------------------

    const call = usdoFrom.interface.encodeFunctionData('sendToYBAndLend', [
        deployer.address,
        deployer.address,
        toChain.lzChainId,
        {
            amount: amountToLend,
            market: singularity.address,
            marketHelper: marketsHelper.address,
        },
        {
            extraGasLimit: 1_000_000,
            strategyDeposit: false,
            zroPaymentAddress: deployer.address,
        },
        [permitLendStruct],
    ]);

    const lz = await hre.ethers.getContractAt(
        'ILayerZeroEndpoint',
        await usdoFrom.lzEndpoint(),
    );
    const callFee = (
        await lz.estimateFees(
            toChain.lzChainId,
            usdoFrom.address,
            call,
            false,
            hre.ethers.utils.solidityPack(['uint16', 'uint256'], [1, 200000]),
        )
    ).nativeFee;

    console.log(`[+] Call fee: ${hre.ethers.utils.formatEther(callFee)} Ether`);

    const tx = await (
        await usdoFrom.sendToYBAndLend(
            deployer.address,
            deployer.address,
            toChain.lzChainId,
            {
                amount: amountToLend,
                market: singularity.address,
                marketHelper: marketsHelper.address,
            },
            {
                extraGasLimit: 1_000_000,
                zroPaymentAddress: deployer.address,
            },
            [permitLendStruct],
            { value: callFee.mul(2) },
        )
    ).wait();
    console.log(`[+] Lend Tx ${tx.transactionHash}`);
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
