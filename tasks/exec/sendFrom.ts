import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';

// TODO use the new task arg system
// to fantom_testnet
// npx hardhat sendFrom --contract-name USDO --src goerli --dst arbitrum_goerli --value 1.34 --tag '1.0'
export const sendFrom__task = async (
    taskArgs: {
        contractName: string;
        src: string;
        dst: string;
        value: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    const { contractName, src, dst, value } = taskArgs;

    const srcChainConfig = hre.SDK.utils.getChainBy('name', src);
    const dstChainConfig = hre.SDK.utils.getChainBy('name', dst);

    const availableChains = hre.SDK.utils
        .getSupportedChains()
        .map((e) => e.name);
    if (!srcChainConfig) {
        throw new Error(
            `Chain ${src} not found. Available chains: ${availableChains}`,
        );
    }
    if (!dstChainConfig) {
        throw new Error(
            `Chain ${dst} not found. Available chains: ${availableChains}`,
        );
    }
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'global');
    const srcUSDODeployment = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            TAPIOCA_PROJECTS_NAME.TapiocaBar,
            srcChainConfig.chainId,
        )
        .filter((e) => e.name == 'USDO')[0];

    console.log(`USDO FROM ${srcUSDODeployment.address}`);
    const srcContract = await hre.ethers.getContractAt(
        'USDO',
        srcUSDODeployment.address,
    );

    const formattedEther = hre.ethers.utils.parseUnits(value, 18);

    console.log(
        `[+] Sending ${formattedEther} of ${contractName} from ${src} to ${dst}`,
    );

    const signer = (await hre.ethers.getSigners())[0];
    const sendFromFee = (
        await srcContract.estimateSendFee(
            dstChainConfig.lzChainId,
            '0x'.concat(signer.address.split('0x')[1].padStart(64, '0')),
            formattedEther,
            false,
            hre.ethers.utils.solidityPack(['uint16', 'uint256'], [1, 200000]),
        )
    ).nativeFee;
    const tx = await (
        await srcContract.sendFrom(
            signer.address,
            dstChainConfig.lzChainId,
            '0x'.concat(signer.address.split('0x')[1].padStart(64, '0')),
            formattedEther,
            {
                adapterParams: hre.ethers.utils.solidityPack(
                    ['uint16', 'uint256'],
                    [
                        1,
                        hre.SDK.config.MIN_GAS_FOR_PACKET_TYPE[
                            hre.SDK.config.EPacketType.PT_SEND
                        ],
                    ],
                ),
                refundAddress: signer.address,
                zroPaymentAddress: hre.ethers.constants.AddressZero,
            },
            { value: sendFromFee },
        )
    ).wait(3);
    console.log('[+] Tx hash:', tx.transactionHash);
    console.log('[+] Done');
};
