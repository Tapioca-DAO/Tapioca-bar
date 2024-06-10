import * as TAP_TOKEN_CONFIG from '@tap-token/config';
import * as TAPIOCA_PERIPH_CONFIG from '@tapioca-periph/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TTapiocaDeployTaskArgs } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { TContract } from '@tapioca-sdk/shared';
import * as TAPIOCA_Z_CONFIG from '@tapiocaz/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadGlobalContract, setLzPeer__task } from 'tapioca-sdk';
import { TTapiocaDeployerVmPass } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
// Used to bypass inference conflict
import { TTapiocaDeployerVmPass as TTapiocaDeployerVmPass_NODE_PACKAGE } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { buildBBMediumRiskMC } from 'tasks/deployBuilds/buildBBMediumRiskMC';
import { buildBBModules } from 'tasks/deployBuilds/buildBBModules';
import { buildERC20WithoutStrategy } from 'tasks/deployBuilds/buildERC20WithoutStrategy';
import { buildGlpStrategy } from 'tasks/deployBuilds/buildGlpStrategy';
import { buildMarketHelper } from 'tasks/deployBuilds/buildMarketHelper';
import { buildPenrose } from 'tasks/deployBuilds/buildPenrose';
import { buildSGLInterestHelper } from 'tasks/deployBuilds/buildSGLInterestHelper';
import { buildSGLMediumRiskMC } from 'tasks/deployBuilds/buildSGLMediumRiskMC';
import { buildSGLModules } from 'tasks/deployBuilds/buildSGLModules';
import { buildSdaiStrategy } from 'tasks/deployBuilds/buildSdaiStrategy';
import { buildSimpleLeverageExecutor } from 'tasks/deployBuilds/buildSimpleLeverageExecutor';
import { buildUSDO } from 'tasks/deployBuilds/buildUSDO';
import { buildUSDOExtExec } from 'tasks/deployBuilds/buildUSDOExtExec';
import { buildUSDOFlashloanHelper } from 'tasks/deployBuilds/buildUSDOFlashloanHelper';
import { buildUSDOModules } from 'tasks/deployBuilds/buildUSDOModules';
import { setupPostLbp1 } from './1-1-setupPostLbp';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from './DEPLOY_CONFIG';
import { buildUsdoHelper } from 'tasks/deployBuilds/buildUsdoHelper';

/**
 * @notice Should be called after TapiocaZ `postLbp` task
 *
 * Deploys on Ethereum and Sepolia
 * Penrose, SGL, USDO, YB Assets
 * SGL Markets: sDAI
 *
 * Deploys on Arbitrum and Arbitrum Sepolia
 * BB Markets: mtETH, tReth, tWSTETH
 * SGL Markets: sGLP
 *
 * Deploys: Arb, Eth
 * - USDO
 * - Penrose
 * - SGL
 * - BB
 * - Market Helper
 * - USDO Flashloan Helper
 * - USDO Modules
 * - SGL Modules
 * - BB Modules
 * - SGL Interest Helper
 * - SGL Medium Risk MC
 * - BB Medium Risk MC
 * - Simple Leverage Executor
 * - USDO Flashloan Helper
 *
 * Post deploy:
 *  !!! REQUIRE HAVING 1 amount of tsDAI, tmtEth, tReth, tWSTETH, tSGLP, tWeth in TapiocaMulticall !!!
 * - Set LZ Peer in USDO
 * - Creating USDO Strat Asset and setting it in Penrose
 * - Registering MCs in Penrose
 * - Registering BB and SGL markets in Penrose
 * - Registering Big Bang Eth Market
 * - Registering USDO Flashloan Helper as Minter/Burner in USDO
 * - Creating and registering YB Assets for SGL and BB markets (sDAI, mtETH, tReth, tWSTETH, sGLP, weth)
 * - Deposit Yb Assets (tsDai, tmtETH, tTReth, tTWSTETH, tSGLP, tWeth) in YieldBox
 * - Init BB and SGL markets (Calls: market init + set interest helper)
 * - Registering BB markets as Minter/Burner in USDO
 *
 */
export const deployPostLbp__task_1 = async (
    _taskArgs: TTapiocaDeployTaskArgs & { noLzPeer?: boolean },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying Post LBP phase 1');
    await hre.SDK.DeployerVM.tapiocaDeployTask(
        _taskArgs,
        {
            hre,
            // Static simulation needs to be false, constructor relies on external call. We're using 0x00 replacement with DeployerVM, which creates a false positive for static simulation.
            staticSimulation: false,
        },
        tapiocaDeployTask,
        tapiocaPostDeployTask,
    );
    console.log('[+] Deployed Post LBP phase 1');
};

async function tapiocaPostDeployTask(
    params: TTapiocaDeployerVmPass<{ noLzPeer?: boolean }>,
) {
    const { hre, taskArgs, VM, chainInfo } = params;
    const { tag } = taskArgs;

    if (!taskArgs.noLzPeer) {
        await setLzPeer__task({ tag, targetName: DEPLOYMENT_NAMES.USDO }, hre);
    }

    await setupPostLbp1(
        params as unknown as TTapiocaDeployerVmPass_NODE_PACKAGE<object>,
    );
}

async function tapiocaDeployTask(params: TTapiocaDeployerVmPass<object>) {
    const {
        hre,
        VM,
        tapiocaMulticallAddr,
        taskArgs,
        isTestnet,
        chainInfo,
        isHostChain,
        isSideChain,
    } = params;
    const { tag } = taskArgs;
    const owner = tapiocaMulticallAddr;

    const {
        cluster,
        pearlmit,
        tapStratWithAsset,
        tapToken,
        wethStratWithAsset,
        yieldBox,
        zeroXSwapper,
    } = deploy__LoadDeployments_Generic({ hre, tag, isTestnet });

    /**
     * USDO
     */
    // @ts-ignore
    (await buildUSDOModules(hre)).forEach((module) => VM.add(module));

    VM.add(await buildUsdoHelper(hre))
        .add(await buildUSDOExtExec(hre))
        .add(
            await buildSimpleLeverageExecutor(hre, {
                cluster,
                zeroXSwapper,
                weth: DEPLOY_CONFIG.MISC[hre.SDK.eChainId]!.WETH!,
                pearlmit,
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
            tapAssetId: tapStratWithAsset.meta.ybAssetId,
            wethAssetId: wethStratWithAsset.meta.ybAssetId,
            owner,
        }),
    )
        .add(
            await buildSGLMediumRiskMC(
                hre,
                DEPLOYMENT_NAMES.SGL_MEDIUM_RISK_MC,
            ),
        )
        .add(await buildSGLInterestHelper(hre));

    /**
     * Assets on Arbitrum and Arbitrum Sepolia
     * Origin strategy only: tETH
     * SGL Markets: sGLP
     * BB Markets: mtETH,tReth, tWSTETH
     */
    VM.add(await buildMarketHelper(hre));
    if (isHostChain) {
        const { yieldBox, mtETH, tETH, tReth, tWSTETH, tSGLP, wethGlpOracle } =
            deploy__LoadDeployments_Arb({
                hre,
                tag,
                isTestnet,
            });

        // @ts-ignore
        (await buildBBModules(hre)).forEach((module) => VM.add(module));

        // BB Asset strategies
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
                        DEPLOYMENT_NAMES.YB_T_ETH_ASSET_WITHOUT_STRATEGY,
                    token: tETH,
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
            );

        // BB Markets
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

        // SGL asset strategies
        if (isTestnet) {
            VM.add(
                await buildERC20WithoutStrategy(hre, {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITHOUT_STRATEGY,
                    token: tSGLP,
                    yieldBox,
                }),
            );
        } else {
            VM.add(
                await buildGlpStrategy(hre, [
                    yieldBox,
                    DEPLOY_CONFIG.POST_LBP[chainInfo.chainId]!.glpStrat!
                        .gmxRewardRouter,
                    DEPLOY_CONFIG.POST_LBP[chainInfo.chainId]!.glpStrat!
                        .glpRewardRouter,
                    tSGLP,
                    wethGlpOracle,
                    '0x',
                    owner,
                ]),
            );
        }
        // SGL markets
        VM.add(
            await buildSGLMediumRiskMC(hre, DEPLOYMENT_NAMES.SGL_S_GLP_MARKET),
        );
    }

    /**
     * SGL Assets on Ethereum and Sepolia
     * SGL Markets: sDAI
     */
    if (isSideChain) {
        const { tSdai } = deploy__LoadDeployments_Eth({ hre, tag, isTestnet });
        // SGL asset strategies
        if (isTestnet) {
            VM.add(
                await buildERC20WithoutStrategy(hre, {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITHOUT_STRATEGY,
                    token: tSdai,
                    yieldBox,
                }),
            );
        } else {
            VM.add(
                await buildSdaiStrategy(hre, [
                    yieldBox,
                    tSdai,
                    DEPLOY_CONFIG.POST_LBP[chainInfo.chainId]!.sDAI!,
                    owner,
                ]),
            );
        }

        // SGL markets
        VM.add(
            await buildSGLMediumRiskMC(hre, DEPLOYMENT_NAMES.SGL_S_DAI_MARKET),
        );
    }
}

export function deploy__LoadDeployments_Generic(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
    isTestnet: boolean;
}) {
    const { hre, tag, isTestnet } = params;
    const tapToken = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapToken,
        hre.SDK.eChainId,
        TAP_TOKEN_CONFIG.DEPLOYMENT_NAMES.TAP_TOKEN,
        tag,
    ).address;
    const yieldBox = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.YIELDBOX,
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
        isTestnet
            ? TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.ZERO_X_SWAPPER_MOCK
            : TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.ZERO_X_SWAPPER,
        params.tag,
    ).address;

    type TStratAsset = TContract & { meta: { ybAssetId: string } };
    const tapStratWithAsset: TStratAsset = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.TAP_TOKEN_YB_EMPTY_STRAT,
        params.tag,
    );
    const wethStratWithAsset: TStratAsset = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.WETH_YB_EMPTY_STRAT,
        params.tag,
    );

    return {
        tapToken,
        yieldBox,
        cluster,
        pearlmit,
        zeroXSwapper,
        tapStratWithAsset,
        wethStratWithAsset,
    };
}

export function deploy__LoadDeployments_Eth(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
    isTestnet: boolean;
}) {
    const { hre, tag, isTestnet } = params;

    const tSdaiMarketOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.MARKET_SDAI_ORACLE,
        tag,
    ).address;

    const tSdai = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.eChainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.tsDAI,
        tag,
    ).address;

    return {
        ...deploy__LoadDeployments_Generic({ hre, tag, isTestnet }),
        tSdaiMarketOracle,
        tSdai,
    };
}

export function deploy__LoadDeployments_Arb(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
    isTestnet: boolean;
}) {
    const { hre, tag, isTestnet } = params;

    const mtETH = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.eChainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.mtETH,
        tag,
    ).address;

    const tETH = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.eChainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.tETH,
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

    const ethMarketOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.MARKET_TETH_ORACLE,
        tag,
    ).address;

    const tRethMarketOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.MARKET_RETH_ORACLE,
        tag,
    ).address;

    const tWstEthMarketOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.MARKET_WSTETH_ORACLE,
        tag,
    ).address;

    const tSGLPMarketOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.MARKET_GLP_ORACLE,
        tag,
    ).address;

    const wethGlpOracle = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.ETH_GLP_ORACLE,
        tag,
    ).address;

    const tSGLP = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.eChainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.tsGLP,
        tag,
    ).address;

    return {
        ...deploy__LoadDeployments_Generic({ hre, tag, isTestnet }),
        mtETH,
        tETH,
        tReth,
        tWSTETH,
        ethMarketOracle,
        tRethMarketOracle,
        tWstEthMarketOracle,
        tSGLPMarketOracle,
        tSGLP,
        wethGlpOracle,
    };
}
