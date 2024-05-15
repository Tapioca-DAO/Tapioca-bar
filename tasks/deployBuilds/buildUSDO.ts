import {
    IDependentOn,
    IDeployerVMAdd,
} from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    UsdoInitStructStruct,
    UsdoModulesInitStructStruct,
} from '@typechain/contracts/usdo/Usdo';
import { Usdo__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildUSDO = async (
    hre: HardhatRuntimeEnvironment,
    params: {
        initData: UsdoInitStructStruct;
        modules: UsdoModulesInitStructStruct;
    },
    dependsOn: IDependentOn[],
): Promise<IDeployerVMAdd<Usdo__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('Usdo'),
        deploymentName: DEPLOYMENT_NAMES.USDO,
        args: [params.initData, params.modules],
        dependsOn,
    };
};
