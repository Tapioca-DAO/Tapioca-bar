import { TDeploymentVMContract } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import {
    BigBang__factory,
    IYieldBox,
    Singularity__factory,
} from '@typechain/index';
import { BigNumberish } from 'ethers';
import {
    deploy__LoadDeployments_Arb,
    deploy__LoadDeployments_Eth,
    deploy__LoadDeployments_Generic,
} from '../1-1-deployPostLbp';
import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from '../DEPLOY_CONFIG';
import { checkExists, loadLocalContract } from 'tapioca-sdk';

export async function setupInitAndRegisterMarket(params: TPostDeployParams) {
    const { hre, deployed, tag, isSideChain, isHostChain, isTestnet } = params;

    const leverageExecutorAddr = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.SIMPLE_LEVERAGE_EXECUTOR,
    )!.address;
    const penroseAddr = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
    )!.address;

    const usdo = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.USDO,
    )!.address;
    const usdoStrategy = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
        tag,
    );

    const interestHelper = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.SGL_INTEREST_HELPER,
    )!.address;

    const { yieldBox: yieldBoxDep } = deploy__LoadDeployments_Generic({
        hre,
        tag,
        isTestnet,
    });

    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        yieldBoxDep,
    )) as IYieldBox;

    /**
     * BigBang
     */
    if (isHostChain) {
        const {
            mtETH,
            ethMarketOracle,
            tReth,
            tRethMarketOracle,
            tWSTETH,
            tWstEthMarketOracle,
        } = deploy__LoadDeployments_Arb({
            hre,
            tag,
            isTestnet,
        });
        // MT_ETH
        {
            const mtEthDeployConf =
                DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.mtEthMarketConfig!;
            await initBBMarket({
                ...params,
                factory: await hre.ethers.getContractFactory('BigBang'),
                marketName: DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
                collateralAddr: mtETH,
                strategyDepName:
                    DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
                oracleAddr: ethMarketOracle,
                debtRateAgainstEth: mtEthDeployConf.debtRateAgainstEth,
                debtRateMin: mtEthDeployConf.debtRateMin,
                debtRateMax: mtEthDeployConf.debtRateMax,
                collateralizationRate: mtEthDeployConf.collateralizationRate,
                liquidationCollateralizationRate:
                    mtEthDeployConf.liquidationCollateralizationRate,
                exchangeRatePrecision: (1e18).toString(),
                leverageExecutorAddr,
                penroseAddr,
                yieldBox,
            });
        }

        // T_RETH
        {
            const tRethDeployConf =
                DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.tRethMarketConfig!;
            await initBBMarket({
                ...params,
                factory: await hre.ethers.getContractFactory('BigBang'),
                marketName: DEPLOYMENT_NAMES.BB_T_RETH_MARKET,
                collateralAddr: tReth,
                strategyDepName:
                    DEPLOYMENT_NAMES.YB_T_RETH_ASSET_WITHOUT_STRATEGY,
                oracleAddr: tRethMarketOracle,
                debtRateAgainstEth: tRethDeployConf.debtRateAgainstEth,
                debtRateMin: tRethDeployConf.debtRateMin,
                debtRateMax: tRethDeployConf.debtRateMax,
                collateralizationRate: tRethDeployConf.collateralizationRate,
                liquidationCollateralizationRate:
                    tRethDeployConf.liquidationCollateralizationRate,
                exchangeRatePrecision: (1e18).toString(),
                leverageExecutorAddr,
                penroseAddr,
                yieldBox,
            });
        }

        // T_WST_ETH
        {
            const tWSTETHDeployConf =
                DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.twSTETHMarketConfig!;
            await initBBMarket({
                ...params,
                factory: await hre.ethers.getContractFactory('BigBang'),
                marketName: DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET,
                collateralAddr: tWSTETH,
                strategyDepName:
                    DEPLOYMENT_NAMES.YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY,
                oracleAddr: tWstEthMarketOracle,
                debtRateAgainstEth: tWSTETHDeployConf.debtRateAgainstEth,
                debtRateMin: tWSTETHDeployConf.debtRateMin,
                debtRateMax: tWSTETHDeployConf.debtRateMax,
                collateralizationRate: tWSTETHDeployConf.collateralizationRate,
                liquidationCollateralizationRate:
                    tWSTETHDeployConf.liquidationCollateralizationRate,
                exchangeRatePrecision: (1e18).toString(),
                leverageExecutorAddr,
                penroseAddr,
                yieldBox,
            });
        }
    }

    /**
     * Singularity
     */

    // SDAI
    if (isSideChain) {
        const { tSdaiMarketOracle, tSdai } = deploy__LoadDeployments_Eth({
            hre,
            tag,
            isTestnet,
        });
        {
            const tSdaiDeployConf =
                DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.tSdaiMarketConfig!;
            await initSGLMarket({
                ...params,
                factory: await hre.ethers.getContractFactory('Singularity'),
                marketName: DEPLOYMENT_NAMES.SGL_S_DAI_MARKET,
                collateralAddr: tSdai,
                oracleAddr: tSdaiMarketOracle,
                strategyDepName:
                    DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITHOUT_STRATEGY,
                usdoStrategy: usdoStrategy.address,
                usdoAddr: usdo,
                collateralizationRate: tSdaiDeployConf.collateralizationRate,
                liquidationCollateralizationRate:
                    tSdaiDeployConf.liquidationCollateralizationRate,
                exchangeRatePrecision: (1e18).toString(),
                leverageExecutorAddr,
                penroseAddr,
                yieldBox,
                interestHelper,
            });
        }
    }

    if (isHostChain) {
        const { tSGLPMarketOracle, tSGLP } = deploy__LoadDeployments_Arb({
            hre,
            tag,
            isTestnet,
        });
        // SGLP
        {
            const tSglpDeployConf =
                DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.tSGlpMarketConfig!;

            await initSGLMarket({
                ...params,
                factory: await hre.ethers.getContractFactory('Singularity'),
                marketName: DEPLOYMENT_NAMES.SGL_S_GLP_MARKET,
                collateralAddr: tSGLP,
                oracleAddr: tSGLPMarketOracle,
                strategyDepName:
                    DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITHOUT_STRATEGY,
                usdoStrategy: usdoStrategy.address,
                usdoAddr: usdo,
                collateralizationRate: tSglpDeployConf.collateralizationRate,
                liquidationCollateralizationRate:
                    tSglpDeployConf.liquidationCollateralizationRate,
                exchangeRatePrecision: (1e18).toString(),
                leverageExecutorAddr,
                penroseAddr,
                yieldBox,
                interestHelper,
            });
        }
    }
}

async function initBBMarket(
    params: TPostDeployParams & {
        factory: BigBang__factory;
        penroseAddr: string;
        marketName: string;
        collateralAddr: string;
        yieldBox: IYieldBox;
        strategyDepName: string;
        oracleAddr: string;
        leverageExecutorAddr: string;
        exchangeRatePrecision: BigNumberish;
        collateralizationRate: BigNumberish;
        debtRateAgainstEth: BigNumberish;
        liquidationCollateralizationRate: BigNumberish;
        debtRateMin: BigNumberish;
        debtRateMax: BigNumberish;
    },
) {
    const {
        hre,
        deployed,
        marketName,
        calls,
        yieldBox,
        factory,
        penroseAddr,
        collateralAddr,
        collateralizationRate,
        debtRateAgainstEth,
        debtRateMax,
        debtRateMin,
        exchangeRatePrecision,
        leverageExecutorAddr,
        liquidationCollateralizationRate,
        oracleAddr,
    } = params;

    const marketDep = deployed.find((e) => e.name === marketName)!;
    const market = factory.attach(marketDep.address);

    if ((await market._penrose()).toLowerCase() !== penroseAddr.toLowerCase()) {
        console.log(`\t[+] Init market ${marketName} ${marketDep.address}`);

        const strategyAddr = deployed.find(
            (e) => e.name === params.strategyDepName,
        )!.address;
        const collateralId = await yieldBox.ids(
            1,
            collateralAddr,
            strategyAddr,
            0,
        );
        if (collateralId.eq(0)) {
            throw new Error(
                `Collateral id is 0 for collateral ${collateralAddr} on strategy ${params.strategyDepName} ${strategyAddr}`,
            );
        }

        const modulesData = {
            _liquidationModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.BB_LIQUIDATION_MODULE,
            }),
            _borrowModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.BB_BORROW_MODULE,
            }),
            _collateralModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.BB_COLLATERAL_MODULE,
            }),
            _leverageModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.BB_LEVERAGE_MODULE,
            }),
        };

        const debtData = {
            _debtRateAgainstEth: debtRateAgainstEth,
            _debtRateMin: debtRateMin,
            _debtRateMax: debtRateMax,
        };

        const data = {
            _penrose: penroseAddr,
            _collateral: collateralAddr,
            _collateralId: collateralId,
            _oracle: oracleAddr,
            _exchangeRatePrecision: exchangeRatePrecision,
            _collateralizationRate: collateralizationRate,
            _liquidationCollateralizationRate: liquidationCollateralizationRate,
            _leverageExecutor: leverageExecutorAddr,
        };

        const bbData = new hre.ethers.utils.AbiCoder().encode(
            [
                'tuple(address _liquidationModule, address _borrowModule, address _collateralModule, address _leverageModule)',
                'tuple(uint256 _debtRateAgainstEth, uint256 _debtRateMin, uint256 _debtRateMax)',
                'tuple(address _penrose, address _collateral, uint256 _collateralId, address _oracle, uint256 _exchangeRatePrecision, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate, address _leverageExecutor)',
            ],
            [modulesData, debtData, data],
        );

        calls.push({
            target: market.address,
            callData: market.interface.encodeFunctionData('init', [bbData]),
            allowFailure: false,
        });
    }
}

async function initSGLMarket(
    params: TPostDeployParams & {
        factory: Singularity__factory;
        penroseAddr: string;
        marketName: string;
        collateralAddr: string;
        strategyDepName: string;
        oracleAddr: string;
        usdoAddr: string;
        usdoStrategy: string;
        yieldBox: IYieldBox;
        leverageExecutorAddr: string;
        exchangeRatePrecision: BigNumberish;
        collateralizationRate: BigNumberish;
        liquidationCollateralizationRate: BigNumberish;
        interestHelper: string;
    },
) {
    const {
        hre,
        deployed,
        marketName,
        calls,
        yieldBox,
        factory,
        penroseAddr,
        collateralAddr,
        strategyDepName,
        usdoAddr,
        usdoStrategy,
        exchangeRatePrecision,
        leverageExecutorAddr,
        oracleAddr,
        collateralizationRate,
        liquidationCollateralizationRate,
        interestHelper,
    } = params;

    const marketDep = deployed.find((e) => e.name === marketName)!;
    const market = factory.attach(marketDep.address);
    const penrose = await hre.ethers.getContractAt('Penrose', penroseAddr);

    if ((await market._penrose()).toLowerCase() !== penroseAddr.toLowerCase()) {
        console.log(`\t[+] Init market ${marketName} ${marketDep.address}`);

        const assetId = await yieldBox.ids(1, usdoAddr, usdoStrategy, 0);
        const collateralStrategy = deployed.find(
            (e) => e.name === strategyDepName,
        )!.address;
        const collateralId = await yieldBox.ids(
            1,
            collateralAddr,
            collateralStrategy,
            0,
        );
        if (collateralId.eq(0)) {
            throw new Error(
                `Collateral id is 0 for collateral ${collateralAddr} on strategy ${strategyDepName} ${collateralStrategy}`,
            );
        }

        const modulesData = {
            _liquidationModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.SGL_LIQUIDATION_MODULE,
            }),
            _borrowModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.SGL_BORROW_MODULE,
            }),
            _collateralModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.SGL_COLLATERAL_MODULE,
            }),
            _leverageModule: loadModule({
                deployed,
                deploymentName: DEPLOYMENT_NAMES.SGL_LEVERAGE_MODULE,
            }),
        };

        const tokensData = {
            _asset: usdoAddr,
            _assetId: assetId,
            _collateral: collateralAddr,
            _collateralId: collateralId,
        };

        const data = {
            penrose_: penroseAddr,
            _oracle: oracleAddr,
            _exchangeRatePrecision: exchangeRatePrecision ?? 0,
            _collateralizationRate: collateralizationRate,
            _liquidationCollateralizationRate: liquidationCollateralizationRate,
            _leverageExecutor: leverageExecutorAddr,
        };

        const sglData = new hre.ethers.utils.AbiCoder().encode(
            [
                'tuple(address _liquidationModule, address _borrowModule, address _collateralModule, address _leverageModule)',
                'tuple(address _asset, uint256 _assetId, address _collateral, uint256 _collateralId)',
                'tuple(address penrose_, address _oracle, uint256 _exchangeRatePrecision, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate, address _leverageExecutor)',
            ],
            [modulesData, tokensData, data],
        );

        calls.push({
            target: market.address,
            callData: market.interface.encodeFunctionData('init', [sglData]),
            allowFailure: false,
        });
        const addrZero = hre.ethers.constants.AddressZero;
        // Set interest helper
        console.log(
            `\t[+] Set interest helper ${interestHelper} in market ${marketName}`,
        );
        console.log(penrose.address);
        calls.push({
            target: penrose.address,
            callData: penrose.interface.encodeFunctionData('executeMarketFn', [
                [market.address],
                [
                    market.interface.encodeFunctionData(
                        'setSingularityConfig',
                        [
                            addrZero,
                            addrZero,
                            addrZero,
                            addrZero,
                            addrZero,
                            addrZero,
                            addrZero,
                            interestHelper,
                        ],
                    ),
                ],
                true, // revert on failure
            ]),
            allowFailure: false,
        });
    }
}

function loadModule(params: {
    deployed: TDeploymentVMContract[];
    deploymentName: string;
}) {
    const { deployed } = params;
    const moduleDep = deployed.find((e) => e.name === params.deploymentName)!;
    return moduleDep.address;
}
