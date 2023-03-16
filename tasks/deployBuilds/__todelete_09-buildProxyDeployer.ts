import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { ProxyDeployer__factory } from '../../typechain/factories/contracts/singularity/ProxyDeployer__factory';

export const buildProxyDeployer = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<ProxyDeployer__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('ProxyDeployer'),
        deploymentName: 'ProxyDeployer',
        args: [],
    };
};
