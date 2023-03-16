import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { MarketsProxy__factory } from '../../typechain';

export const buildMarketProxy = async (
    hre: HardhatRuntimeEnvironment,
    lzEndpoint: string,
    owner: string,
): Promise<IDeployerVMAdd<MarketsProxy__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('MarketsProxy'),
        deploymentName: 'MarketsProxy',
        args: [lzEndpoint, owner],
    };
};
