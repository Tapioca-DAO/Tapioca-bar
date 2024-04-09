import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    TapiocaOmnichainExtExec,
    TapiocaOmnichainExtExec__factory,
} from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildUSDOExtExec = async (
    hre: HardhatRuntimeEnvironment,
    params: {
        cluster: string;
        owner: string;
    },
): Promise<IDeployerVMAdd<TapiocaOmnichainExtExec__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory(
            'TapiocaOmnichainExtExec',
        ),
        deploymentName: DEPLOYMENT_NAMES.USDO_EXT_EXEC,
        args: [params.cluster, params.owner],
        dependsOn: [],
    };
};
