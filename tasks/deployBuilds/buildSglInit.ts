import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { SGLInit__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildSglInit = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<SGLInit__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('SGLInit'),
        deploymentName: DEPLOYMENT_NAMES.SGL_INIT,
        args: [],
    };
};
