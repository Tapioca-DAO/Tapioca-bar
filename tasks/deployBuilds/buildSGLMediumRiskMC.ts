import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Singularity__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildSGLMediumRiskMC = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<Singularity__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('Singularity'),
        deploymentName: DEPLOYMENT_NAMES.SGL_MEDIUM_RISK_MC,
        args: [],
        dependsOn: [],
    };
};
