import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { SGlpMarketLiquidatorReceiver__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from '../deploy/DEPLOY_CONFIG';

export const buildsGLPMarketLiquidatorReceiver = async (
    hre: HardhatRuntimeEnvironment,
    args: Parameters<SGlpMarketLiquidatorReceiver__factory['deploy']>,
): Promise<IDeployerVMAdd<SGlpMarketLiquidatorReceiver__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory(
            'SGlpMarketLiquidatorReceiver',
        ),
        deploymentName: DEPLOYMENT_NAMES.SGlpMARKET_LIQUIDATOR_RECEIVER,
        args,
    };
};
