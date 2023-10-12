import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { Cluster__factory } from '../../gitsub_tapioca-sdk/src/typechain/tapioca-periphery';
import ClusterArtifact from '../../gitsub_tapioca-sdk/src/artifacts/tapioca-periphery/Cluster.json';

export const buildCluster = async (
    hre: HardhatRuntimeEnvironment,
    lzEndpoint: string,
): Promise<IDeployerVMAdd<Cluster__factory>> => {
    const Cluster = (await hre.ethers.getContractFactoryFromArtifact(
        ClusterArtifact,
    )) as Cluster__factory;

    return {
        contract: Cluster,
        deploymentName: 'Cluster',
        args: [lzEndpoint],
        runStaticSimulation: false,
    };
};
