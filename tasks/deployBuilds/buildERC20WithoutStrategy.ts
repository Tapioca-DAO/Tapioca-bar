import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { ERC20WithoutStrategy__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const buildERC20WithoutStrategy = async (
    hre: HardhatRuntimeEnvironment,
    params: { deploymentName: string; yieldBox: string; token: string },
): Promise<IDeployerVMAdd<ERC20WithoutStrategy__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('ERC20WithoutStrategy'),
        deploymentName: params.deploymentName,
        args: [params.yieldBox, params.token],
        dependsOn: [],
    };
};
