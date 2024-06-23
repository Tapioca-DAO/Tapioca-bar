import {
    TTapiocaDeployerVmPass,
    TTapiocaDeployTaskArgs,
} from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

import * as TAPIOCA_PERIPH_CONFIG from '@tapioca-periph/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    createEmptyStratYbAsset__task,
    loadGlobalContract,
    loadLocalContract,
} from 'tapioca-sdk';
import { DEPLOYMENT_NAMES } from './DEPLOY_CONFIG';
import { buildERC20WithoutStrategy } from 'tasks/deployBuilds/buildERC20WithoutStrategy';
import * as TAPIOCA_Z_CONFIG from '@tapiocaz/config';
import {
    depositSglAssetYB,
    depositUsdoYbAndAddSgl,
} from './postDepSetup/utils_seedSglAssetInYb';

/**
 * @notice needs to be called after tapioca periph final
 * Only called on Arbitrum
 *
 * Deploy: Arb
 * - tSglSdai without strategy
 * - tSglSglp without strategy
 *
 * Post deploy: Arb, Eth
 * - Registers tSglSdai & tSglSglp asset it in the yieldbox
 * - Deposit tSglSdai & tSglSglp in the yieldbox
 * - Sets the USDO oracle in BigBang markets
 */
export const deployFinal__task = async (
    _taskArgs: TTapiocaDeployTaskArgs,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying Post LBP phase 2');
    await hre.SDK.DeployerVM.tapiocaDeployTask(
        _taskArgs,
        {
            hre,
            staticSimulation: false,
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        async () => {},
        tapiocaPostDeployTask,
    );
    console.log('[+] Deployed final phase');
};

async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<unknown>) {
    const {
        hre,
        taskArgs,
        VM,
        chainInfo,
        tapiocaMulticallAddr,
        isHostChain,
        isSideChain,
        isTestnet,
    } = params;
    const { tag } = taskArgs;
    const bb = await hre.ethers.getContractAt('BigBang', '');

    if (isHostChain) {
        const penrose = await hre.ethers.getContractAt(
            'Penrose',
            loadLocalContract(
                hre,
                chainInfo.chainId,
                DEPLOYMENT_NAMES.PENROSE,
                tag,
            ).address,
        );

        const usdoOracleAddy = loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
            chainInfo.chainId,
            TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.USDO_USDC_UNI_V3_ORACLE,
            tag,
        ).address;

        const calls: TapiocaMulticall.CallStruct[] = [];

        // Register USDO oracle in BigBang markets
        {
            console.log('[+] Setting USDO oracle in BigBang markets');
            const penroseExecuteMarketFnsAddys: string[] = [];
            const penroseExecuteMarketFnsData: string[] = [];

            const addBBSetConfig = async (bbMarket: string) => {
                const bbAddy = loadLocalContract(
                    hre,
                    chainInfo.chainId,
                    bbMarket,
                    tag,
                ).address;

                console.log(
                    '[+] Setting USDO oracle',
                    usdoOracleAddy,
                    'for',
                    bbMarket,
                    bbAddy,
                );
                penroseExecuteMarketFnsAddys.push(bbAddy);
                penroseExecuteMarketFnsData.push(
                    bb.interface.encodeFunctionData('setAssetOracle', [
                        usdoOracleAddy,
                        '0x',
                    ]),
                );
            };

            await addBBSetConfig(DEPLOYMENT_NAMES.BB_MT_ETH_MARKET);
            await addBBSetConfig(DEPLOYMENT_NAMES.BB_T_RETH_MARKET);
            await addBBSetConfig(DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET);

            calls.push({
                target: penrose.address,
                allowFailure: false,
                callData: penrose.interface.encodeFunctionData(
                    'executeMarketFn',
                    [
                        penroseExecuteMarketFnsAddys,
                        penroseExecuteMarketFnsData,
                        true,
                    ],
                ),
            });
        }

        const { tSglSdai, tSglSglp } = await loadContract__deployFinal__task({
            hre,
            tag,
        });

        // Register deployed tSglSdai & tSglSglp asset in yieldbox
        {
            await createEmptyStratYbAsset__task(
                {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY,
                    tag,
                    token: tSglSdai.address,
                },
                hre,
            );

            await createEmptyStratYbAsset__task(
                {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_T_SGL_SGLP_ASSET_WITHOUT_STRATEGY,
                    tag,
                    token: tSglSglp.address,
                },
                hre,
            );
        }

        // Deposit SglSdai & SglSglp assets in yieldbox
        {
            await depositUsdoYbAndAddSgl({
                hre,
                marketName: TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.T_SGL_GLP_MARKET,
                calls,
                tag,
                multicallAddr: tapiocaMulticallAddr,
                isTestnet,
            });
            await depositUsdoYbAndAddSgl({
                hre,
                marketName: TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.T_SGL_GLP_MARKET,
                calls,
                tag,
                multicallAddr: tapiocaMulticallAddr,
                isTestnet,
            });
        }
        await VM.executeMulticall(calls);

        // Need to first register the assets to get the IDs
        // Deposit tSglSdai & tSglSglp in yieldbox
        {
            const calls2: TapiocaMulticall.CallStruct[] = [];
            await depositSglAssetYB({
                hre,
                tokenAddr: tSglSdai.address,
                stratName:
                    DEPLOYMENT_NAMES.YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY,
                calls: calls2,
                tag,
                tapiocaMulticallAddr,
                isTestnet,
            });

            await depositSglAssetYB({
                hre,
                tokenAddr: tSglSglp.address,
                stratName:
                    DEPLOYMENT_NAMES.YB_T_SGL_SGLP_ASSET_WITHOUT_STRATEGY,
                calls: calls2,
                tag,
                tapiocaMulticallAddr,
                isTestnet,
            });
            await VM.executeMulticall(calls2);
        }
    }
}

async function loadContract__deployFinal__task(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;
    const tSglSdai = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.chainInfo.chainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.T_SGL_SDAI_MARKET,
        tag,
    );
    const tSglSglp = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.chainInfo.chainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.T_SGL_GLP_MARKET,
        tag,
    );

    return { tSglSdai, tSglSglp };
}
