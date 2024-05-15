import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { UniswapV2Swapper__factory } from '@tapioca-sdk//typechain/tapioca-periphery';
import UniswapV2SwapperArtifact from '@tapioca-sdk//artifacts/tapioca-periphery/UniswapV2Swapper.json';

export const buildMultiSwapper = async (
    hre: HardhatRuntimeEnvironment,
    uniV2Router: string,
    uniV2Factory: string,
    yieldBox: string,
    owner: string,
): Promise<IDeployerVMAdd<UniswapV2Swapper__factory>> => {
    const UniswapV2Swapper = (await hre.ethers.getContractFactoryFromArtifact(
        UniswapV2SwapperArtifact,
    )) as UniswapV2Swapper__factory;

    return {
        contract: UniswapV2Swapper,
        deploymentName: 'MultiSwapper',
        args: [uniV2Router, uniV2Factory, yieldBox, owner],
        dependsOn: [{ argPosition: 2, deploymentName: 'YieldBox' }],
        runStaticSimulation: false,
    };
};
