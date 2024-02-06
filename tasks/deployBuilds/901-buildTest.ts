import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Test__factory } from '../../typechain';

export const buildTest = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<Test__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('Test'),
        deploymentName: 'Test',
        args: [],
        runStaticSimulation: false,
    };
};
