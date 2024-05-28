import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { SimpleLeverageExecutor__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildSimpleLeverageExecutor = async (
    hre: HardhatRuntimeEnvironment,
    params: {
        zeroXSwapper: string;
        cluster: string;
        weth: string;
        pearlmit: string;
        tag: string;
    },
): Promise<IDeployerVMAdd<SimpleLeverageExecutor__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('SimpleLeverageExecutor'),
        deploymentName: DEPLOYMENT_NAMES.SIMPLE_LEVERAGE_EXECUTOR,
        args: [
            params.zeroXSwapper,
            params.cluster,
            params.weth,
            params.pearlmit,
        ],
        dependsOn: [],
    };
};
