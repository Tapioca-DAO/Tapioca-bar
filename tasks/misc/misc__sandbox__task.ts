import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    TTapiocaDeployTaskArgs,
    TTapiocaDeployerVmPass,
} from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

export const misc__sandbox__task = async (
    _taskArgs: TTapiocaDeployTaskArgs,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying Post LBP phase 2');
    await hre.SDK.DeployerVM.tapiocaDeployTask(
        _taskArgs,
        {
            hre,
            staticSimulation: false,
        },
        tapiocaDeployTask,
        tapiocaPostDeployTask,
    );
    console.log('[+] Deployed Post LBP phase 2');
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function tapiocaDeployTask(params: TTapiocaDeployerVmPass<unknown>) {}

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<unknown>) {}
