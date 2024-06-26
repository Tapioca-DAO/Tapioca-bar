import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Singularity__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const buildSGLMediumRiskMC = async (
    hre: HardhatRuntimeEnvironment,
    deploymentName: string,
): Promise<IDeployerVMAdd<Singularity__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('Singularity'),
        deploymentName,
        args: [],
        dependsOn: [],
    };
};
