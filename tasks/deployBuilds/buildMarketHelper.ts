import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { MarketHelper__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from '../deploy/DEPLOY_CONFIG';

export const buildMarketHelper = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<MarketHelper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('MarketHelper'),
        deploymentName: DEPLOYMENT_NAMES.MARKET_HELPER,
        args: [],
    };
};
