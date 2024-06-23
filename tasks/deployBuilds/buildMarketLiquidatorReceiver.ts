import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { MarketLiquidatorReceiver__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from '../deploy/DEPLOY_CONFIG';

export const buildMarketLiquidatorReceiver = async (
    hre: HardhatRuntimeEnvironment,
    args: Parameters<MarketLiquidatorReceiver__factory['deploy']>,
): Promise<IDeployerVMAdd<MarketLiquidatorReceiver__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory(
            'MarketLiquidatorReceiver',
        ),
        deploymentName: DEPLOYMENT_NAMES.MARKET_LIQUIDATOR_RECEIVER,
        args,
    };
};
