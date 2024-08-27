import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { IYieldBox } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { noConflict } from 'lodash';
import { loadGlobalContract, loadLocalContract } from 'tapioca-sdk';
import {
    TTapiocaDeployTaskArgs,
    TTapiocaDeployerVmPass,
} from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { deploy__LoadDeployments_Arb } from 'tasks/deploy/1-1-deployPostLbp';
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
    const { hre, taskArgs, VM, isTestnet } = params;
    const multicallAddr = await VM.getMulticall();

    const usdo = await hre.ethers.getContractAt(
        'Usdo',
        '0x3d3ae3bef1ad63e90e16a0c189b41b4598fd75cb',
    );

    // await cluster.set('1010101')
    await VM.executeMulticall([
        {
            target: usdo.address,
            allowFailure: false,
            callData: usdo.interface.encodeFunctionData('setBurnerStatus', [
                '0x91414b49AB41bcE8028D39B9Dd8283Af080C04C0',
                true,
            ]),
        },
    ]);
}
