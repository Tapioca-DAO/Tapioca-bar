import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { noConflict } from 'lodash';
import { loadLocalContract } from 'tapioca-sdk';
import {
    TTapiocaDeployTaskArgs,
    TTapiocaDeployerVmPass,
} from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

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
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function tapiocaDeployTask(params: TTapiocaDeployerVmPass<unknown>) {}

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<unknown>) {
    const { hre, taskArgs, VM } = params;

    const sgl = await hre.ethers.getContractAt(
        'Singularity',
        '0x4cC941c7095d6639F81D959d5437bc194502E191',
    );

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        loadLocalContract(
            hre,
            hre.SDK.chainInfo.chainId,
            DEPLOYMENT_NAMES.PENROSE,
            taskArgs.tag,
        ).address,
    );
    await VM.executeMulticall([
        {
            target: penrose.address,
            callData: penrose.interface.encodeFunctionData('executeMarketFn', [
                [sgl.address],
                [
                    sgl.interface.encodeFunctionData('setLeverageExecutor', [
                        loadLocalContract(
                            hre,
                            hre.SDK.chainInfo.chainId,
                            DEPLOYMENT_NAMES.SIMPLE_LEVERAGE_EXECUTOR,
                            taskArgs.tag,
                        ).address,
                    ]),
                ],
                true,
            ]),
            allowFailure: false,
        },
    ]);
}
