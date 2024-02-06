import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Cluster__factory } from '@tapioca-sdk/typechain/tapioca-periphery';
import ClusterArtifact from '@tapioca-sdk/artifacts/tapioca-periphery/Cluster.json';

export const buildCluster = async (
    hre: HardhatRuntimeEnvironment,
    lzEndpoint: string,
    owner: string,
): Promise<IDeployerVMAdd<Cluster__factory>> => {
    const Cluster = (await hre.ethers.getContractFactoryFromArtifact(
        ClusterArtifact,
    )) as Cluster__factory;

    return {
        contract: Cluster,
        deploymentName: 'Cluster',
        args: [lzEndpoint, owner],
        runStaticSimulation: false,
    };
};
