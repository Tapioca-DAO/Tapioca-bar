import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TTapiocaDeployerVmPass } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from './DEPLOY_CONFIG';
import { TToftDeployerTaskArgs, VMAddToft } from './toftDeployer__task';
import { setLzPeer__task } from 'tapioca-sdk';
import { buildBalancer } from 'tasks/deployBuilds/buildBalancer';
import { balancerInnitConnectedOft__task } from 'tasks/exec/balancer/balancerInnitConnectedOft__task';

/**
 * @notice Will deploy mtETH, tWSTETH, and tRETH. Will also set the LzPeer for each.
 * @notice Will deploy Balancer contract.
 */
export const deployPostLbp__task = async (
    _taskArgs: TToftDeployerTaskArgs,
    hre: HardhatRuntimeEnvironment,
) => {
    await hre.SDK.DeployerVM.tapiocaDeployTask(
        _taskArgs,
        {
            hre,
            // Static simulation needs to be false, constructor relies on external call. We're using 0x00 replacement with DeployerVM, which creates a false positive for static simulation.
            staticSimulation: false,
        },
        tapiocaDeployTask,
        tapiocaPostDeployTask,
    );
};

async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<object>) {
    const { hre, taskArgs, VM, chainInfo } = params;
    const { tag } = taskArgs;
}

async function tapiocaDeployTask(params: TTapiocaDeployerVmPass<object>) {
    const { hre, VM, tapiocaMulticallAddr, taskArgs, isTestnet, chainInfo } =
        params;
    const { tag } = taskArgs;
    const owner = tapiocaMulticallAddr;
}
