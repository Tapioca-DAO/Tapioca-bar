import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { Cluster__factory } from 'tapioca-sdk/dist/typechain/tapioca-periphery';
import ClusterArtifact from 'tapioca-sdk/dist/artifacts/tapioca-periphery/Cluster.json';

export const buildCluster = async (
    hre: HardhatRuntimeEnvironment,
    lzChainId: string,
): Promise<IDeployerVMAdd<Cluster__factory>> => {
    const Cluster = (await hre.ethers.getContractFactoryFromArtifact(
        ClusterArtifact,
    )) as Cluster__factory;

    return {
        contract: Cluster,
        deploymentName: 'Cluster',
        args: [lzChainId],
        runStaticSimulation: false,
    };
};
