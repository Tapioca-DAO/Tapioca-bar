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

/**
 * @notice needs to be called after tapioca periph final
 * Only called on Arbitrum
 *
 * Deploy: Arb
 * - tSglSdai without strategy
 *
 * Post deploy: Arb
 * - Registers tSglSdai asset it in the yieldbox
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
        tapiocaDeploy,
        tapiocaPostDeployTask,
    );
    console.log('[+] Deployed final phase');
};

async function tapiocaDeploy(params: TTapiocaDeployerVmPass<unknown>) {
    const { hre, taskArgs, VM, chainInfo, tapiocaMulticallAddr } = params;
    const { tag } = taskArgs;

    const yieldBox = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.YIELDBOX,
        tag,
    ).address;

    const { tSglSdai } = await loadContract__deployFinal__task({ hre, tag });

    VM.add(
        await buildERC20WithoutStrategy(hre, {
            deploymentName:
                DEPLOYMENT_NAMES.YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY,
            token: tSglSdai.address,
            yieldBox,
        }),
    );
}

async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<unknown>) {
    const {
        hre,
        taskArgs,
        VM,
        chainInfo,
        tapiocaMulticallAddr,
        isHostChain,
        isSideChain,
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

        // Register deployed tSglSdai asset in yieldbox
        {
            const { tSglSdai } = await loadContract__deployFinal__task({
                hre,
                tag,
            });
            await createEmptyStratYbAsset__task(
                {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY,
                    tag,
                    token: tSglSdai.address,
                },
                hre,
            );
        }

        await VM.executeMulticall(calls);
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

    return { tSglSdai };
}
