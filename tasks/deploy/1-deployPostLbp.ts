import * as TAP_TOKEN_CONFIG from '@tap-token/config';
import * as TAPIOCA_PERIPH_CONFIG from '@tapioca-periph/config';
import * as TAP_YIELDBOX from '@tap-yieldbox/config';
import * as TAPIOCA_Z_CONFIG from '@tapiocaz/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TTapiocaDeployTaskArgs } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadGlobalContract, setLzPeer__task } from 'tapioca-sdk';
import { TTapiocaDeployerVmPass } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { buildBBMediumRiskMC } from 'tasks/deployBuilds/buildBBMediumRiskMC';
import { buildBBModules } from 'tasks/deployBuilds/buildBBModules';
import { buildERC20WithoutStrategy } from 'tasks/deployBuilds/buildERC20WithoutStrategy';
import { buildPenrose } from 'tasks/deployBuilds/buildPenrose';
import { buildSGLMediumRiskMC } from 'tasks/deployBuilds/buildSGLMediumRiskMC';
import { buildSGLModules } from 'tasks/deployBuilds/buildSGLModules';
import { buildSimpleLeverageExecutor } from 'tasks/deployBuilds/buildSimpleLeverageExecutor';
import { buildUSDO } from 'tasks/deployBuilds/buildUSDO';
import { buildUSDOExtExec } from 'tasks/deployBuilds/buildUSDOExtExec';
import { buildUSDOFlashloanHelper } from 'tasks/deployBuilds/buildUSDOFlashloanHelper';
import { buildUSDOModules } from 'tasks/deployBuilds/buildUSDOModules';
import { deployPostLbp__task_2 } from './1-2-deployPostLbp';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from './DEPLOY_CONFIG';
import { setupPostLbp } from './1-setupPostLbp';

/**
 * Deploys on Ethereum and Sepolia
 * Penrose, SGL, USDO, YB Assets
 * SGL Markets: sDAI
 *
 * Deploys on Arbitrum and Arbitrum Sepolia
 * BB Markets: mtETH, tReth, tWSTETH
 * SGL Markets: sGLP
 */
export const deployPostLbp__task = async (
    _taskArgs: TTapiocaDeployTaskArgs,
    hre: HardhatRuntimeEnvironment,
) => {
    await hre.SDK.DeployerVM.tapiocaDeployTask(
        _taskArgs,
        {
            hre,
            // Static simulation needs to be false, constructor relies on external call. We're using 0x00 replacement with DeployerVM, which creates a false positive for static simulation.
            staticSimulation: false,
            overrideOptions: {
                gasLimit: 10_000_000,
            },
        },
        tapiocaDeployTask,
        tapiocaPostDeployTask,
    );
    await deployPostLbp__task_2(_taskArgs, hre);
};

async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<object>) {
    const { hre, taskArgs, VM, chainInfo } = params;
    const { tag } = taskArgs;

    await setLzPeer__task({ tag, targetName: DEPLOYMENT_NAMES.USDO }, hre);

    // @ts-ignore
    await setupPostLbp(params);
}

async function tapiocaDeployTask(params: TTapiocaDeployerVmPass<object>) {
    const { hre, VM, tapiocaMulticallAddr, taskArgs, isTestnet, chainInfo } =
        params;
    const { tag } = taskArgs;
    const owner = tapiocaMulticallAddr;
    const {
        tapToken,
        yieldBox,
        cluster,
        pearlmit,
        zeroXSwapper,
        mtETH,
        tReth,
        tWSTETH,
    } = deploy__LoadDeployments_Arb({
        hre,
        tag,
    });

    /**
     * USDO
     */
    // @ts-ignore
    (await buildUSDOModules(hre)).forEach((module) => VM.add(module));

    VM.add(await buildUSDOExtExec(hre))
        .add(
            await buildSimpleLeverageExecutor(hre, {
                cluster,
                zeroXSwapper,
                weth: DEPLOY_CONFIG.MISC[hre.SDK.eChainId]!.WETH!,
                tag,
            }),
        )
        .add(
            await buildUSDO(
                hre,
                {
                    initData: {
                        endpoint: chainInfo.address,
                        delegate: owner,
                        extExec: '0x',
                        cluster,
                        pearlmit,
                        yieldBox,
                    },
                    modules: {
                        marketReceiverModule: '0x',
                        optionReceiverModule: '0x',
                        usdoReceiverModule: '0x',
                        usdoSenderModule: '0x',
                    },
                },
                [
                    {
                        argPosition: 0,
                        keyName: 'extExec',
                        deploymentName: DEPLOYMENT_NAMES.USDO_EXT_EXEC,
                    },
                    {
                        argPosition: 1,
                        keyName: 'marketReceiverModule',
                        deploymentName:
                            DEPLOYMENT_NAMES.USDO_MARKET_RECEIVER_MODULE,
                    },
                    {
                        argPosition: 1,
                        keyName: 'optionReceiverModule',
                        deploymentName:
                            DEPLOYMENT_NAMES.USDO_OPTION_RECEIVER_MODULE,
                    },
                    {
                        argPosition: 1,
                        keyName: 'usdoReceiverModule',
                        deploymentName: DEPLOYMENT_NAMES.USDO_RECEIVER_MODULE,
                    },
                    {
                        argPosition: 1,
                        keyName: 'usdoSenderModule',
                        deploymentName: DEPLOYMENT_NAMES.USDO_SENDER_MODULE,
                    },
                ],
            ),
        )
        .add(
            await buildUSDOFlashloanHelper(hre, { usdo: '0x', owner }, [
                {
                    argPosition: 0,
                    deploymentName: DEPLOYMENT_NAMES.USDO,
                },
            ]),
        );

    // @ts-ignore
    (await buildSGLModules(hre)).forEach((module) => VM.add(module));
    VM.add(
        await buildPenrose(hre, {
            yieldBox,
            cluster,
            tapToken,
            pearlmit,
            owner,
        }),
    ).add(await buildSGLMediumRiskMC(hre, DEPLOYMENT_NAMES.SGL_MEDIUM_RISK_MC));

    /**
     * Assets on Arbitrum and Arbitrum Sepolia
     * SGL Markets: sGLP
     * BB Markets: mtETH, tReth, tWSTETH
     */
    if (
        chainInfo.name === 'arbitrum' ||
        chainInfo.name === 'arbitrum_sepolia'
    ) {
        // @ts-ignore
        (await buildBBModules(hre)).forEach((module) => VM.add(module));
        VM.add(
            await buildBBMediumRiskMC(hre, DEPLOYMENT_NAMES.BB_MEDIUM_RISK_MC),
        )
            .add(
                await buildBBMediumRiskMC(
                    hre,
                    DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
                ),
            )
            .add(
                await buildBBMediumRiskMC(
                    hre,
                    DEPLOYMENT_NAMES.BB_T_RETH_MARKET,
                ),
            )
            .add(
                await buildBBMediumRiskMC(
                    hre,
                    DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET,
                ),
            );

        // BB markets
        VM.add(
            await buildERC20WithoutStrategy(hre, {
                deploymentName:
                    DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
                token: mtETH,
                yieldBox,
            }),
        )
            .add(
                await buildERC20WithoutStrategy(hre, {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_T_RETH_ASSET_WITHOUT_STRATEGY,
                    token: tReth,
                    yieldBox,
                }),
            )
            .add(
                await buildERC20WithoutStrategy(hre, {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY,
                    token: tWSTETH,
                    yieldBox,
                }),
            )
            .add(
                await buildERC20WithoutStrategy(hre, {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITHOUT_STRATEGY,
                    token: DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.sGLP!,
                    yieldBox,
                }),
            );

        // SGL markets
        VM.add(
            await buildSGLMediumRiskMC(hre, DEPLOYMENT_NAMES.SGL_S_GLP_MARKET),
        );
    }

    /**
     * SGL Assets on Ethereum and Sepolia
     * SGL Markets: sDAI
     */
    if (chainInfo.name === 'ethereum' || chainInfo.name === 'sepolia') {
        VM.add(
            await buildSGLMediumRiskMC(hre, DEPLOYMENT_NAMES.SGL_S_DAI_MARKET),
        );
    }
}

function deploy__LoadDeployments_Generic(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;
    const tapToken = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapToken,
        hre.SDK.eChainId,
        TAP_TOKEN_CONFIG.DEPLOYMENT_NAMES.TAP_TOKEN,
        tag,
    ).address;
    const yieldBox = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.YieldBox,
        hre.SDK.eChainId,
        TAP_YIELDBOX.DEPLOYMENT_NAMES.YieldBox,
        tag,
    ).address;
    const cluster = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.CLUSTER,
        tag,
    ).address;
    const pearlmit = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.PEARLMIT,
        tag,
    ).address;

    const zeroXSwapper = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.ZERO_X_SWAPPER,
        params.tag,
    ).address;

    return {
        tapToken,
        yieldBox,
        cluster,
        pearlmit,
        zeroXSwapper,
    };
}

export function deploy__LoadDeployments_Eth(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;

    const tSdaiOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.S_DAI_ORACLE,
        tag,
    ).address;

    return {
        ...deploy__LoadDeployments_Generic({ hre, tag }),
        tSdaiOracle,
    };
}

export function deploy__LoadDeployments_Arb(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;

    const mtETH = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.eChainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.mtETH,
        tag,
    ).address;

    const tReth = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.eChainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.tRETH,
        tag,
    ).address;

    const tWSTETH = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.eChainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.tWSTETH,
        tag,
    ).address;

    const mtEthOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.ETH_SEER_DUAL_ORACLE,
        tag,
    ).address;

    const tRethOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.RETH_USD_SEER_CL_MULTI_ORACLE,
        tag,
    ).address;

    const tWstEthOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.WSTETH_USD_SEER_CL_MULTI_ORACLE,
        tag,
    ).address;

    const tSGLPOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.GLP_ORACLE,
        tag,
    ).address;

    return {
        ...deploy__LoadDeployments_Generic({ hre, tag }),
        mtETH,
        tReth,
        tWSTETH,
        mtEthOracle,
        tRethOracle,
        tWstEthOracle,
        tSGLPOracle,
    };
}
