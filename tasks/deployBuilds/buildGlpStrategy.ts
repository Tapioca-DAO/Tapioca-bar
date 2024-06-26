import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { GlpStrategy__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from '../deploy/DEPLOY_CONFIG';

export const buildGlpStrategy = async (
    hre: HardhatRuntimeEnvironment,
    args: Parameters<GlpStrategy__factory['deploy']>,
): Promise<IDeployerVMAdd<GlpStrategy__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('GlpStrategy'),
        deploymentName: DEPLOYMENT_NAMES.YB_SGLP_ASSET_WITH_STRATEGY,
        args,
    };
};
