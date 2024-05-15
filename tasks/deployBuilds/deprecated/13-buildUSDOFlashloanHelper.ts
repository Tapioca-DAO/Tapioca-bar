import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { USDOFlashloanHelper__factory } from '../../typechain';

export const buildUSDOFlashloanHelper = async (
    hre: HardhatRuntimeEnvironment,
    owner: string,
): Promise<IDeployerVMAdd<USDOFlashloanHelper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('USDOFlashloanHelper'),
        deploymentName: 'USDOFlashloanHelper',
        args: [hre.ethers.constants.AddressZero, owner],
        dependsOn: [{ argPosition: 0, deploymentName: 'USDO' }],
        runStaticSimulation: false,
    };
};
