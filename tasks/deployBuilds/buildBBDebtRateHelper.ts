import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { BBDebtRateHelper__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildBBDebtRateHelper = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<BBDebtRateHelper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('BBDebtRateHelper'),
        deploymentName: DEPLOYMENT_NAMES.BB_DEBT_RATE_HELPER,
        args: [],
        dependsOn: [],
    };
};
