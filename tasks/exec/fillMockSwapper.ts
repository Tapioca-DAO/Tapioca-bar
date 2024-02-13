import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { ERC20Mock } from '@tapioca-sdk/typechain/tapioca-mocks';
import { YieldBox } from '@tapioca-sdk/typechain/YieldBox';
import { TapiocaOFT } from '@tapioca-sdk/typechain/tapiocaz';
import TapiocaOFTArtifact from '@tapioca-sdk/artifacts/tapiocaz/TapiocaOFT.json';
import ERC20MockArtifact from '@tapioca-sdk/artifacts/tapioca-mocks/ERC20Mock.json';
import YieldBoxArtifact from '@tapioca-sdk/artifacts/YieldBox/contracts/YieldBox.sol/YieldBox.json';
import {
    EChainID,
    NETWORK_MAPPING_CHAIN_TO_LZ,
    TAPIOCA_PROJECTS_NAME,
} from '@tapioca-sdk/api/config';
import inquirer from 'inquirer';
import { TContract } from '@tapioca-sdk/shared';
import { BigNumber } from 'ethers';

const attachTOFT = async (
    hre: HardhatRuntimeEnvironment,
    address: string,
    signer: SignerWithAddress,
) => {
    const token = new hre.ethers.Contract(
        address,
        TapiocaOFTArtifact.abi,
        signer,
    );
    return token.connect(signer);
};

const attachToken = async (
    hre: HardhatRuntimeEnvironment,
    address: string,
    signer: SignerWithAddress,
) => {
    const token = new hre.ethers.Contract(
        address,
        ERC20MockArtifact.abi,
        signer,
    );
    return token.connect(signer);
};

async function getLinkedContract(
    hre: HardhatRuntimeEnvironment,
    tag: string,
    contractToConf: TContract,
) {
    const dstDeployment = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            TAPIOCA_PROJECTS_NAME.TapiocaZ,
            EChainID.ARBITRUM_GOERLI,
        )
        .filter((e) => e.name == contractToConf.name)[0];

    return {
        lzChainId: NETWORK_MAPPING_CHAIN_TO_LZ[EChainID.ARBITRUM_GOERLI],
        contract: dstDeployment,
    };
}

export const useNetwork = async (
    hre: HardhatRuntimeEnvironment,
    chainInfo: {
        name: string;
        address: string;
        chainId: string;
        lzChainId: string;
        rpc: string;
        tags: any;
    },
) => {
    const pk = process.env.PRIVATE_KEY;
    if (pk === undefined) throw new Error('[-] PRIVATE_KEY not set');

    const provider = new hre.ethers.providers.JsonRpcProvider(
        {
            url: chainInfo.rpc.replace(
                '<api_key>',
                process.env.ALCHEMY_API_KEY,
            ),
        },
        {
            chainId: parseInt(chainInfo.chainId),
            name: `rpc-${chainInfo.chainId}`,
        },
    );

    return { signer: new hre.ethers.Wallet(pk, provider), provider: provider };
};

export const fillMockSwapper__test = async (
    taskArgs: { toft: string; assetid: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const signer = (await hre.ethers.getSigners())[0];
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const toft = (await attachTOFT(hre, taskArgs.toft, signer)) as TapiocaOFT;

    try {
        const hostChainId = await toft.hostChainID();
        if (hostChainId.toNumber() != parseInt(chainInfo.chainId)) {
            console.log(`   [-] Not host chain. Skipping: ${taskArgs.toft}`);
            return;
        }
    } catch {
        console.log('   [-] Error retrieving host chain. Aborting!');
        return;
    }

    const mintAmount = hre.ethers.utils.parseEther('100000000');
    const underlyingErc20 = await toft.erc20();
    const token = await attachToken(hre, underlyingErc20, signer);
    console.log('   [+] Minting the underlying tokens');
    await token.connect(signer).mintTo(signer.address, mintAmount);
    console.log('   [+] Wrapping the underlying tokens');
    await (
        await token.connect(signer).approve(toft.address, mintAmount)
    ).wait(3);
    await (
        await toft
            .connect(signer)
            .wrap(signer.address, signer.address, mintAmount)
    ).wait(3);

    if (chainInfo.name == 'arbitrum_goerli') {
        console.log(
            '   [+] We are on main chain. No need to send the tOFT to arb_goerli',
        );
        const mockSwapperDeployment = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'MockSwapper');
        if (!mockSwapperDeployment) {
            throw new Error('[-] MockSwapper not found');
        }
        const yieldBoxDeployment = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'YieldBox');
        if (!yieldBoxDeployment) {
            throw new Error('[-] YieldBox not found');
        }

        const ybContract = new hre.ethers.Contract(
            yieldBoxDeployment.address,
            YieldBoxArtifact.abi,
            signer,
        ) as YieldBox;

        console.log(`   [+] Depositing to YieldBox ${ybContract.address}`);
        await toft.approve(yieldBoxDeployment.address, mintAmount);
        await ybContract.depositAsset(
            taskArgs.assetid,
            signer.address,
            mockSwapperDeployment.address,
            mintAmount,
            0,
        );
    } else {
        console.log(
            '   [+] Not on the main chain. Need to send the tOFT to arb_goerli',
        );
        const srcDeployment = hre.SDK.db
            .loadGlobalDeployment(
                tag,
                TAPIOCA_PROJECTS_NAME.TapiocaZ,
                chainInfo.chainId,
            )
            .filter((e) => e.address == toft.address)[0];
        console.log('   [+] Loading the linked tOFT');
        const arbTargetDetails = await getLinkedContract(
            hre,
            tag,
            srcDeployment,
        );

        console.log(
            `   [+] Computing the LZ fee for ${arbTargetDetails.lzChainId} and amount ${mintAmount}`,
        );

        const sendFromFee = (
            await toft.estimateSendFee(
                arbTargetDetails.lzChainId,
                '0x'.concat(signer.address.split('0x')[1].padStart(64, '0')),
                mintAmount,
                false,
                hre.ethers.utils.solidityPack(
                    ['uint16', 'uint256'],
                    [1, 200000],
                ),
            )
        ).nativeFee;

        console.log(
            `   [+] Necessary fee for cross chain tx is: ${hre.ethers.utils.formatEther(
                sendFromFee.mul(2),
            )}`,
        );
        const { wantToContinue } = await inquirer.prompt({
            type: 'confirm',
            name: 'wantToContinue',
            message: 'Do you want to continue?',
        });

        if (!wantToContinue) {
            console.log('   [-] Fee not accepted. Aborting');
            return;
        }
        console.log('       [+] Sending over layers:');
        const tx = await (
            await toft.sendFrom(
                signer.address,
                arbTargetDetails.lzChainId,
                '0x'.concat(signer.address.split('0x')[1].padStart(64, '0')),
                mintAmount,
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
                { value: sendFromFee.mul(2) },
            )
        ).wait(150);
        console.log('       [+] sendFrom tx hash:', tx.transactionHash);

        const dstChainInfo = hre.SDK.utils.getChainBy(
            'chainId',
            EChainID.ARBITRUM_GOERLI,
        );
        const dstChainNetworkSigner = await useNetwork(hre, dstChainInfo);

        const dstTOFT = new hre.ethers.Contract(
            arbTargetDetails.contract.address,
            TapiocaOFTArtifact.abi,
            dstChainNetworkSigner.provider,
        ).connect(dstChainNetworkSigner.signer);

        const dstYieldBox = hre.SDK.db
            .loadLocalDeployment(tag, dstChainInfo.chainId)
            .find((e) => e.name == 'YieldBox');

        const mockSwapperDeployment = hre.SDK.db
            .loadLocalDeployment(tag, dstChainInfo.chainId)
            .find((e) => e.name == 'MockSwapper');
        if (!mockSwapperDeployment) {
            throw new Error('       [-] MockSwapper not found');
        }

        await dstTOFT
            .connect(dstChainNetworkSigner.signer)
            .approve(dstYieldBox.address, mintAmount);
        const dstYbContract = new hre.ethers.Contract(
            dstYieldBox.address,
            YieldBoxArtifact.abi,
            dstChainNetworkSigner.provider,
        ) as YieldBox;
        console.log('   [+] Depositing to YB');
        await dstYbContract
            .connect(dstChainNetworkSigner.signer)
            .depositAsset(
                taskArgs.assetid,
                dstChainNetworkSigner.signer.address,
                mockSwapperDeployment.address,
                mintAmount,
                0,
            );
    }

    console.log('[+] Done');
};
