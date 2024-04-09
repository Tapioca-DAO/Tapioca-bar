import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { BigBang__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildBBMediumRiskMC = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<BigBang__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('BigBang'),
        deploymentName: DEPLOYMENT_NAMES.BB_MEDIUM_RISK_MC,
        args: [],
        dependsOn: [],
    };
};
