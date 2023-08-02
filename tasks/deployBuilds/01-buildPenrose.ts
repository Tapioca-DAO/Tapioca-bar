import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { Penrose__factory } from '../../typechain';

// TODO - Check on WETH behavior
export const buildPenrose = async (
    hre: HardhatRuntimeEnvironment,
    tapTokenAddress: string,
    wethTokenAddress: string,
    owner: string,
    yieldBox: string,
    chainId: string,
): Promise<IDeployerVMAdd<Penrose__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('Penrose'),
        deploymentName: 'Penrose',
        args: [yieldBox, tapTokenAddress, wethTokenAddress, chainId, owner],
        dependsOn: [{ argPosition: 0, deploymentName: 'YieldBox' }],
        runStaticSimulation: false,
    };
};
