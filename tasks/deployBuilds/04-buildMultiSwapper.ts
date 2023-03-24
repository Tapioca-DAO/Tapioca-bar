import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { MultiSwapper__factory } from '../../typechain';

export const buildMultiSwapper = async (
    hre: HardhatRuntimeEnvironment,
    uniV2Factory: string,
    uniV2PairHash: string,
): Promise<IDeployerVMAdd<MultiSwapper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('MultiSwapper'),
        deploymentName: 'MultiSwapper',
        args: [
            uniV2Factory,
            // YieldBox, to be replaced by VM
            hre.ethers.constants.AddressZero,
            uniV2PairHash,
        ],
        dependsOn: [{ argPosition: 1, deploymentName: 'YieldBox' }],
        runStaticSimulation: false,
    };
};
