import { TDeploymentVMContract } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { BigBang__factory, IYieldBox } from '@typechain/index';
import { BigNumberish } from 'ethers';
import { deployLoadDeployments } from '../1-deployPostLbp';
import { TPostDeployParams } from '../1-setupPostLbp';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from '../DEPLOY_CONFIG';

export async function setupInitAndRegisterMarket(params: TPostDeployParams) {
    const { hre, deployed, tag } = params;

    const {
        yieldBox: yieldBoxDep,
        mtETH,
        mtEthOracle,
        tReth,
        tRethOracle,
        tWSTETH,
        tWstEthOracle,
    } = deployLoadDeployments({
        hre,
        tag,
    });
    const yieldBox = await hre.ethers.getContractAt('IYieldBox', yieldBoxDep);
    const leverageExecutorAddr = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.SIMPLE_LEVERAGE_EXECUTOR,
    )!.address;

    const penroseAddr = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
    )!.address;

    // MT_ETH
    {
        const mtEthDeployConf =
            DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.mtEthMarketConfig!;
        await initBBMarket({
            ...params,
            factory: await hre.ethers.getContractFactory('BigBang'),
            marketName: DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
            collateralAddr: mtETH,
            strategyDepName: DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
            oracleAddr: mtEthOracle,
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
            strategyDepName: DEPLOYMENT_NAMES.YB_T_RETH_ASSET_WITHOUT_STRATEGY,
            oracleAddr: tRethOracle,
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
            DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!.twSTETH!;
        await initBBMarket({
            ...params,
            factory: await hre.ethers.getContractFactory('BigBang'),
            marketName: DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET,
            collateralAddr: tWSTETH,
            strategyDepName:
                DEPLOYMENT_NAMES.YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY,
            oracleAddr: tWstEthOracle,
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

    if ((await market.penrose()).toLowerCase() !== penroseAddr.toLowerCase()) {
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

function loadModule(params: {
    deployed: TDeploymentVMContract[];
    deploymentName: string;
}) {
    const { deployed } = params;
    const moduleDep = deployed.find((e) => e.name === params.deploymentName)!;
    return moduleDep.address;
}
