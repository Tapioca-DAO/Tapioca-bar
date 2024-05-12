import {
    IDependentOn,
    IDeployerVMAdd,
} from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { USDOFlashloanHelper__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildUSDOFlashloanHelper = async (
    hre: HardhatRuntimeEnvironment,
    params: {
        usdo: string;
        owner: string;
    },
    dependsOn: IDependentOn[],
): Promise<IDeployerVMAdd<USDOFlashloanHelper__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('USDOFlashloanHelper'),
        deploymentName: DEPLOYMENT_NAMES.USDO_FLASHLOAN_HELPER,
        args: [params.usdo, params.owner],
        dependsOn,
    };
};
