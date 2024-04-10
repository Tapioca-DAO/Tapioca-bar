import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { BigBang__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const buildBBMediumRiskMC = async (
    hre: HardhatRuntimeEnvironment,
    deploymentName: string,
): Promise<IDeployerVMAdd<BigBang__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('BigBang'),
        deploymentName,
        args: [],
        dependsOn: [],
    };
};
