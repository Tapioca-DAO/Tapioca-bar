import { IYieldBox } from '@typechain/index';
import {
    deploy__LoadDeployments_Arb,
    deploy__LoadDeployments_Eth,
    deploy__LoadDeployments_Generic,
} from '../1-1-deployPostLbp';
import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOY_CONFIG, DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

/**
 * @notice - Register sDAI and sGLP as YB assets for SGL.
 * @notice - Register mtETH, wstETH, rETH YB assets for BB.
 * Usdo is already registered in `SetupUsdoInPenrose()`
 */
export async function setupCreateYBAssets(params: TPostDeployParams) {
    const { hre, tag, isTestnet, isHostChain, isSideChain } = params;

    const { yieldBox: ybAddress } = deploy__LoadDeployments_Generic({
        hre,
        tag,
        isTestnet,
    });

    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        ybAddress,
    )) as IYieldBox;

    /**
     * SGL
     * Register sDAI as YB assets
     */
    if (isSideChain) {
        // const { tSdai } = deploy__LoadDeployments_Eth({ hre, tag, isTestnet });
        // await setupCreateYBAssets__addNewAsset({
        //     ...params,
        //     assetAddress: tSdai,
        //     strategyDepName: isTestnet
        //         ? DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITHOUT_STRATEGY
        //         : DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITH_STRATEGY,
        //     assetName: 'tsDAI',
        //     yieldBox,
        // });
    }

    if (isHostChain) {
        const {
            mtETH,
            tETH,
            tReth,
            tWSTETH,
            tStgUsdcV2,
            tZro,
            // tSGLP
        } = deploy__LoadDeployments_Arb({
            hre,
            tag,
            isTestnet,
        });

        /**
         * SGL
         * Register sGLP as YB assets
         */
        // await setupCreateYBAssets__addNewAsset({
        //     ...params,
        //     assetAddress: tSGLP,
        //     strategyDepName: isTestnet
        //         ? DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITHOUT_STRATEGY
        //         : DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITH_STRATEGY,
        //     assetName: 'tsGLP',
        //     yieldBox,
        // });
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tStgUsdcV2,
            strategyDepName:
                DEPLOYMENT_NAMES.YB_STG_USDC_V2_ASSET_WITHOUT_STRATEGY,
            assetName: 'tStgUsdcV2',
            yieldBox,
        });
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.usdcMock!,
            strategyDepName:
                DEPLOYMENT_NAMES.YB_T_USDC_MOCK_ASSET_WITHOUT_STRATEGY,
            assetName: 'tUsdcMock',
            yieldBox,
        });

        /**
         * Origins
         * Register tETH as YB assets
         */
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tETH,
            strategyDepName: DEPLOYMENT_NAMES.YB_T_ETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'tETH',
            yieldBox,
        });

        /**
         * BB
         * Register mtETH, wstETH, rETH as YB assets
         */
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: mtETH,
            strategyDepName: DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'mtETH',
            yieldBox,
        });

        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tReth,
            strategyDepName: DEPLOYMENT_NAMES.YB_T_RETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'tReth',
            yieldBox,
        });

        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tWSTETH,
            strategyDepName:
                DEPLOYMENT_NAMES.YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'tWSTETH',
            yieldBox,
        });
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tZro,
            strategyDepName: DEPLOYMENT_NAMES.YB_T_ZRO_ASSET_WITHOUT_STRATEGY,
            assetName: 'tZro',
            yieldBox,
        });
    }
}

export async function setupCreateYBAssets__addNewAsset(
    params: TPostDeployParams & {
        assetName: string;
        assetAddress: string;
        strategyDepName: string;
        yieldBox: IYieldBox;
    },
) {
    const {
        deployed,
        assetAddress,
        strategyDepName,
        assetName,
        calls,
        yieldBox,
    } = params;
    const assetDep = deployed.find((e) => e.name === strategyDepName)!;
    const assetId = await yieldBox.ids(1, assetAddress, assetDep.address, 0);

    if (assetId.eq(0)) {
        console.log(
            `\t[+] Registering ${assetName} ${assetAddress} as YB asset in ${yieldBox.address}`,
        );
        calls.push({
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData('registerAsset', [
                1, // tokenType
                assetAddress,
                assetDep.address,
                0, // tokenId
            ]),
            allowFailure: false,
        });
    }
}
