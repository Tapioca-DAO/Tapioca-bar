import { IYieldBox } from '@typechain/index';
import {
    deploy__LoadDeployments_Arb,
    deploy__LoadDeployments_Generic,
} from '../1-1-deployPostLbp';
import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from '../DEPLOY_CONFIG';

/**
 * @notice - Register sDAI and sGLP as YB assets for SGL.
 * @notice - Register mtETH, wstETH, rETH YB assets for BB.
 * Usdo is already registered in `SetupUsdoInPenrose()`
 */
export async function setupCreateYBAssets(params: TPostDeployParams) {
    const { hre, tag } = params;

    const { yieldBox: ybAddress } = deploy__LoadDeployments_Generic({
        hre,
        tag,
    });

    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        ybAddress,
    )) as IYieldBox;

    /**
     * SGL
     * Register sDAI as YB assets
     */
    if (
        hre.SDK.chainInfo.name === 'ethereum' ||
        hre.SDK.chainInfo.name === 'sepolia' ||
        hre.SDK.chainInfo.name === 'optimism_sepolia'
    ) {
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.sDAI!,
            assetDepName: DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITHOUT_STRATEGY,
            assetName: 'sDAI',
            assetType: 1,
            strategyType: 0,
            yieldBox,
        });
    }

    if (
        hre.SDK.chainInfo.name === 'arbitrum' ||
        hre.SDK.chainInfo.name === 'arbitrum_sepolia'
    ) {
        const { mtETH, tETH, tReth, tWSTETH } = deploy__LoadDeployments_Arb({
            hre,
            tag,
        });

        /**
         * SGL
         * Register sGLP as YB assets
         */
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.sGLP!,
            assetDepName: DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITHOUT_STRATEGY,
            assetName: 'sGLP',
            assetType: 1,
            strategyType: 0,
            yieldBox,
        });

        /**
         * Origins
         * Register tETH as YB assets
         */
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tETH,
            assetDepName: DEPLOYMENT_NAMES.YB_T_ETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'tETH',
            assetType: 1,
            strategyType: 0,
            yieldBox,
        });

        /**
         * BB
         * Register mtETH, wstETH, rETH as YB assets
         */
        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: mtETH,
            assetDepName: DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'mtETH',
            assetType: 1,
            strategyType: 0,
            yieldBox,
        });

        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tReth,
            assetDepName: DEPLOYMENT_NAMES.YB_T_RETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'tReth',
            assetType: 1,
            strategyType: 0,
            yieldBox,
        });

        await setupCreateYBAssets__addNewAsset({
            ...params,
            assetAddress: tWSTETH,
            assetDepName: DEPLOYMENT_NAMES.YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY,
            assetName: 'tWSTETH',
            assetType: 1,
            strategyType: 0,
            yieldBox,
        });
    }
}

export async function setupCreateYBAssets__addNewAsset(
    params: TPostDeployParams & {
        assetName: string;
        assetAddress: string;
        assetDepName: string;
        yieldBox: IYieldBox;
        assetType: number;
        strategyType: number;
    },
) {
    const {
        deployed,
        assetAddress,
        assetDepName,
        assetName,
        assetType,
        calls,
        strategyType,
        yieldBox,
    } = params;
    const assetDep = deployed.find((e) => e.name === assetDepName)!;
    const assetId = await yieldBox.ids(
        assetType,
        assetAddress,
        assetDep.address,
        strategyType,
    );

    if (assetId.eq(0)) {
        console.log(
            `\t[+] Registering ${assetName} ${assetAddress} as YB asset in ${yieldBox.address}`,
        );
        calls.push({
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData('registerAsset', [
                assetType,
                assetAddress,
                assetDep.address,
                strategyType,
            ]),
            allowFailure: false,
        });
    }
}
