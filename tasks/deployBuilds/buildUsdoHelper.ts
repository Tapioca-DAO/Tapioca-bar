import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { UsdoHelper__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildUsdoHelper = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<UsdoHelper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('UsdoHelper'),
        deploymentName: DEPLOYMENT_NAMES.USDO_HELPER,
        args: [],
    };
};
