import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { SimpleLeverageExecutor__factory } from '../../typechain';

export const buildSimpleLeverageExecutor = async (
    hre: HardhatRuntimeEnvironment,
    clusterAddress: string,
): Promise<IDeployerVMAdd<SimpleLeverageExecutor__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('SimpleLeverageExecutor'),
        deploymentName: 'SimpleLeverageExecutor',
        args: [
            hre.ethers.constants.AddressZero,
            hre.ethers.constants.AddressZero,
            clusterAddress,
        ],
        dependsOn: [
            { argPosition: 0, deploymentName: 'YieldBox' },
            { argPosition: 1, deploymentName: 'MultiSwapper' },
            { argPosition: 2, deploymentName: 'Cluster' },
        ],
        runStaticSimulation: false,
    };
};
