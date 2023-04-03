import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { Magnetar__factory } from '../../typechain';

export const buildMagnetar = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<Magnetar__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('Magnetar'),
        deploymentName: 'Magnetar',
        args: [],
    };
};
