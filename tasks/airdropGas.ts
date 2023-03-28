import { HardhatRuntimeEnvironment } from 'hardhat/types';
import SDK from 'tapioca-sdk';
import { USDO } from '../typechain';

// Airdrop gas from Goerli to Fuji, can only send the same amount. Need 1 USDO available for each transaction
// hh airdropGas --amount 0.24 --dst-chain 10106 --dst-address 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764 --network arbitrum_goerli
export const airdropGas__task = async (
    taskArgs: {
        amount: string;
        dstAddress: string;
        dstChain: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    const fromChain = SDK.API.utils
        .getSupportedChains()
        .find(async (c) => c.chainId === (await hre.getChainId()));
    const toChain = SDK.API.utils
        .getSupportedChains()
        .find((c) => c.lzChainId === taskArgs.dstChain);

    if (!fromChain) throw new Error('[-] From chain not supported');
    if (!toChain) throw new Error('[-] To chain not supported');

    const usd0 = (
        await hre.SDK.hardhatUtils.getLocalContract<USDO>(
            hre,
            'USDO',
            await hre.SDK.hardhatUtils.askForTag(hre, 'local'),
        )
    ).contract;

    const { deployer: signer } = await hre.getNamedAccounts();

    console.log('[+] Building TX');

    const adapterParams = hre.ethers.utils.solidityPack(
        ['uint16', 'uint', 'uint', 'address'],
        [2, 200000, hre.ethers.utils.parseEther(taskArgs.amount), signer],
    );
    const fee = (
        await usd0.estimateSendFee(
            taskArgs.dstChain,
            signer.padEnd(66, '0'),
            (1e10).toString(),
            false,
            adapterParams,
        )
    ).nativeFee;

    const tx = await usd0.sendFrom(
        signer,
        taskArgs.dstChain,
        signer.padEnd(66, '0'),
        (1e10).toString(),
        {
            adapterParams,
            refundAddress: signer,
            zroPaymentAddress: signer,
        },
        { value: fee },
    );
    console.log(`[+] Tx hash: ${tx.hash}`);
};
