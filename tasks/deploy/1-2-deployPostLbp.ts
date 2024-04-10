import { TTapiocaDeployTaskArgs } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadLocalContract } from 'tapioca-sdk';
import { TTapiocaDeployerVmPass } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { buildOrigins } from 'tasks/deployBuilds/buildOrigins';
import { deployLoadDeployments } from './1-deployPostLbp';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from './DEPLOY_CONFIG';

export const deployPostLbp__task_2 = async (
    _taskArgs: TTapiocaDeployTaskArgs,
    hre: HardhatRuntimeEnvironment,
) => {
    await hre.SDK.DeployerVM.tapiocaDeployTask(
        _taskArgs,
        {
            hre,
            staticSimulation: false,
        },
        tapiocaDeployTask,
    );
};

async function tapiocaDeployTask(params: TTapiocaDeployerVmPass<object>) {
    const { hre, VM, tapiocaMulticallAddr, taskArgs, isTestnet, chainInfo } =
        params;
    const { tag } = taskArgs;
    const owner = tapiocaMulticallAddr;

    const { yieldBox, mtETH, mtEthOracle } = deployLoadDeployments({
        hre,
        tag,
    });

    const usdo = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.USDO,
        tag,
    );
    const usdoStrategy = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
        tag,
    );
    const mtEthStrategy = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
        tag,
    );

    if (
        chainInfo.name === 'arbitrum' ||
        chainInfo.name === 'arbitrum_sepolia'
    ) {
        VM.add(
            await buildOrigins(hre, {
                asset: usdo.address,
                assetStrategy: usdoStrategy.address,
                collateral: mtETH,
                collateralStrategy: mtEthStrategy.address,
                collateralizationRate:
                    DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!
                        .mtEthOriginsMarketConfig!.collateralizationRate,
                deploymentName: DEPLOYMENT_NAMES.ORIGINS_MT_ETH_MARKET,
                oracle: mtEthOracle,
                owner,
                yieldBox,
            }),
        );
    }
}
