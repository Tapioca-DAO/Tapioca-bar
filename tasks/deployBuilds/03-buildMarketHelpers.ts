import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { MarketsHelper__factory } from '../../typechain';

export const buildMarketHelpers = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<MarketsHelper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('MarketsHelper'),
        deploymentName: 'MarketsHelper',
        args: [],
    };
};
