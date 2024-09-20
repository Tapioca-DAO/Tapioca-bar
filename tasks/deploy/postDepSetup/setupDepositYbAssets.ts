import { TTapiocaDeployerVmPass } from 'tapioca-sdk/ethers/hardhat/DeployerVM';
import {
    deploy__LoadDeployments_Arb,
    deploy__LoadDeployments_Eth,
} from '../1-1-deployPostLbp';
import { TPostDeployParams } from '../1-1-setupPostLbp';
import { wrapToft } from '../2-deployFinal';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';
import { depositSglAssetYB } from './utils_seedSglAssetInYb';
import { BigNumberish } from 'ethers';

export async function setupDepositYbAssets(
    taskParams: TTapiocaDeployerVmPass<any>,
    params: TPostDeployParams,
) {
    const {
        hre,
        VM,
        deployed,
        calls,
        isHostChain,
        isSideChain,
        tag,
        isTestnet,
    } = params;
    const tapiocaMulticallAddr = (await VM.getMulticall()).address;

    const depositAsset = async (args: {
        tokenAddr: string;
        stratName: string;
        amount: BigNumberish;
    }) => {
        const { tokenAddr, stratName, amount } = args;
        await depositSglAssetYB({
            amount,
            hre,
            tokenAddr,
            stratName,
            calls,
            tag,
            tapiocaMulticallAddr,
            isTestnet,
        });
    };

    // Deposit SglSdai & SglSglp assets in yieldbox
    if (isSideChain && !isTestnet) {
        // const {
        //     // tSdai
        // } = deploy__LoadDeployments_Eth({ hre, tag, isTestnet });
        // await wrapToft({
        //     calls,
        //     tapTakParams: taskParams,
        //     toftAddr: tSdai,
        //     wrapAmount: hre.ethers.utils.parseEther('0.1'),
        // });
        // await depositAsset({
        //     tokenAddr: tSdai,
        //     stratName: isTestnet
        //         ? DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITHOUT_STRATEGY
        //         : DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITH_STRATEGY,
        //     amount: hre.ethers.utils.parseEther('0.1'),
        // });
    }

    if (isHostChain && !isTestnet) {
        const {
            mtETH,
            tETH,
            tReth,
            tWSTETH,
            tZro,
            tStgUsdcV2,
            // tSGLP
        } = deploy__LoadDeployments_Arb({
            hre,
            tag,
            isTestnet,
        });

        // tsGLP
        await wrapToft({
            calls,
            tapTakParams: taskParams,
            toftAddr: tSGLP,
            wrapAmount: hre.ethers.utils.parseEther('0.1'),
        });
        await depositAsset({
            tokenAddr: tSGLP,
            stratName: isTestnet
                ? DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITHOUT_STRATEGY
                : DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITH_STRATEGY,
            amount: hre.ethers.utils.parseEther('0.1'),
        });

        // tETH
        await wrapToft({
            calls,
            tapTakParams: taskParams,
            toftAddr: tETH,
            wrapAmount: hre.ethers.utils.parseEther('0.0001'),
        });
        await depositAsset({
            tokenAddr: tETH,
            stratName: DEPLOYMENT_NAMES.YB_T_ETH_ASSET_WITHOUT_STRATEGY,
            amount: hre.ethers.utils.parseEther('0.0001'),
        });

        // mtETH
        await wrapToft({
            calls,
            tapTakParams: taskParams,
            toftAddr: mtETH,
            wrapAmount: hre.ethers.utils.parseEther('0.0001'),
        });
        await depositAsset({
            tokenAddr: mtETH,
            stratName: DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
            amount: hre.ethers.utils.parseEther('0.0001'),
        });

        // tReth
        await wrapToft({
            calls,
            tapTakParams: taskParams,
            toftAddr: tReth,
            wrapAmount: hre.ethers.utils.parseEther('0.0001'),
        });
        await depositAsset({
            tokenAddr: tReth,
            stratName: DEPLOYMENT_NAMES.YB_T_RETH_ASSET_WITHOUT_STRATEGY,
            amount: hre.ethers.utils.parseEther('0.0001'),
        });

        // tWSTETH
        await wrapToft({
            calls,
            tapTakParams: taskParams,
            toftAddr: tWSTETH,
            wrapAmount: hre.ethers.utils.parseEther('0.0001'),
        });
        await depositAsset({
            tokenAddr: tWSTETH,
            stratName: DEPLOYMENT_NAMES.YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY,
            amount: hre.ethers.utils.parseEther('0.0001'),
        });
    }
}
