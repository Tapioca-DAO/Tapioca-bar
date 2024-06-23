import {
    deploy__LoadDeployments_Arb,
    deploy__LoadDeployments_Eth,
} from '../1-1-deployPostLbp';
import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';
import { depositSglAssetYB } from './utils_seedSglAssetInYb';

export async function setupDepositYbAssets(params: TPostDeployParams) {
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
    }) => {
        const { tokenAddr, stratName } = args;
        await depositSglAssetYB({
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
    if (isSideChain) {
        const { tSdai } = deploy__LoadDeployments_Eth({ hre, tag, isTestnet });

        await depositAsset({
            tokenAddr: tSdai,
            stratName: isTestnet
                ? DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITHOUT_STRATEGY
                : DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITH_STRATEGY,
        });
    }

    if (isHostChain) {
        const { mtETH, tETH, tReth, tWSTETH, tSGLP } =
            deploy__LoadDeployments_Arb({
                hre,
                tag,
                isTestnet,
            });

        // tsGLP
        await depositAsset({
            tokenAddr: tSGLP,
            stratName: isTestnet
                ? DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITHOUT_STRATEGY
                : DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITH_STRATEGY,
        });

        // tETH
        await depositAsset({
            tokenAddr: tETH,
            stratName: DEPLOYMENT_NAMES.YB_T_ETH_ASSET_WITHOUT_STRATEGY,
        });

        // mtETH
        await depositAsset({
            tokenAddr: mtETH,
            stratName: DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
        });

        // tReth
        await depositAsset({
            tokenAddr: tReth,
            stratName: DEPLOYMENT_NAMES.YB_T_RETH_ASSET_WITHOUT_STRATEGY,
        });

        // tWSTETH
        await depositAsset({
            tokenAddr: tWSTETH,
            stratName: DEPLOYMENT_NAMES.YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY,
        });
    }
}
