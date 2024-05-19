import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { SGLInterestHelper__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildSGLInterestHelper = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<SGLInterestHelper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('SGLInterestHelper'),
        deploymentName: DEPLOYMENT_NAMES.SGL_INTEREST_HELPER,
        args: [],
    };
};
