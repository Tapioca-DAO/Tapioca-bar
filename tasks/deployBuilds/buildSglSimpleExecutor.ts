import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { AssetToSGLPLeverageExecutor__factory } from '@typechain/index';

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildSglSimpleExecutor = async (
    hre: HardhatRuntimeEnvironment,
    params: {
        zeroXSwapper: string;
        cluster: string;
        glpRewardRouter: string;
        weth: string;
        pearlmit: string;
        tag: string;
    },
): Promise<IDeployerVMAdd<AssetToSGLPLeverageExecutor__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory(
            'AssetToSGLPLeverageExecutor',
        ),
        deploymentName: DEPLOYMENT_NAMES.SGL_LEVERAGE_EXECUTOR,
        args: [
            params.zeroXSwapper,
            params.cluster,
            params.glpRewardRouter,
            params.weth,
            params.pearlmit,
        ],
        dependsOn: [],
    };
};
