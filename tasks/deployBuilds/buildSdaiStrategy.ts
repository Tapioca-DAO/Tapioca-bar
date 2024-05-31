import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { SDaiStrategy__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from '../deploy/DEPLOY_CONFIG';

export const buildSdaiStrategy = async (
    hre: HardhatRuntimeEnvironment,
    args: Parameters<SDaiStrategy__factory['deploy']>,
): Promise<IDeployerVMAdd<SDaiStrategy__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('SDaiStrategy'),
        deploymentName: DEPLOYMENT_NAMES.YB_SDAI_ASSET_WITH_STRATEGY,
        args,
    };
};
