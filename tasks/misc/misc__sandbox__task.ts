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
        loadLocalContract(
            hre,
            hre.SDK.chainInfo.chainId,
            DEPLOYMENT_NAMES.USDO,
            taskArgs.tag,
        ).address,
    );
    const origins = await hre.ethers.getContractAt(
        'Origins',
        loadLocalContract(
            hre,
            hre.SDK.chainInfo.chainId,
            DEPLOYMENT_NAMES.ORIGINS_T_ETH_MARKET,
            taskArgs.tag,
        ).address,
    );
    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
            hre.SDK.chainInfo.chainId,
            'YieldBox',
            taskArgs.tag,
        ).address,
    )) as IYieldBox;

    const usdoStrategy = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
        taskArgs.tag,
    );

    const { tETH } = deploy__LoadDeployments_Arb({
        hre,
        tag: taskArgs.tag,
        isTestnet,
    });
    const tEthStrategy = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.YB_T_ETH_ASSET_WITHOUT_STRATEGY,
        taskArgs.tag,
    );

    const assetId = await yieldBox.ids(
        1,
        usdo.address,
        usdoStrategy.address,
        0,
    );
    const collateralId = await yieldBox.ids(1, tETH, tEthStrategy.address, 0);

    const amount = hre.ethers.utils.parseEther('5');
    const collateralAmount = hre.ethers.utils.parseEther('0.9');

    await VM.executeMulticall([
        {
            target: usdo.address,
            callData: usdo.interface.encodeFunctionData('approve', [
                yieldBox.address,
                amount,
            ]),
            allowFailure: false,
        },
        {
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData('depositAsset', [
                assetId,
                multicallAddr.address,
                multicallAddr.address,
                amount,
                0,
            ]),
            allowFailure: false,
        },
        {
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData(
                'setApprovalForAll',
                [origins.address, true],
            ),
            allowFailure: false,
        },
        {
            target: origins.address,
            callData: origins.interface.encodeFunctionData('repay', [
                '100000000',
            ]),
            allowFailure: false,
        },
        {
            target: origins.address,
            callData: origins.interface.encodeFunctionData('removeCollateral', [
                '100000000',
            ]),
            allowFailure: false,
        },
        {
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData('withdraw', [
                collateralId,
                multicallAddr.address,
                multicallAddr.address,
                collateralAmount,
                0,
            ]),
            allowFailure: false,
        },
    ]);

    // const sgl = await hre.ethers.getContractAt(
    //     'Singularity',
    //     '0x4cC941c7095d6639F81D959d5437bc194502E191',
    // );

    // const penrose = await hre.ethers.getContractAt(
    //     'Penrose',
    //     loadLocalContract(
    //         hre,
    //         hre.SDK.chainInfo.chainId,
    //         DEPLOYMENT_NAMES.PENROSE,
    //         taskArgs.tag,
    //     ).address,
    // );
    // await VM.executeMulticall([
    //     {
    //         target: penrose.address,
    //         callData: penrose.interface.encodeFunctionData('executeMarketFn', [
    //             [sgl.address],
    //             [
    //                 sgl.interface.encodeFunctionData('setLeverageExecutor', [
    //                     loadLocalContract(
    //                         hre,
    //                         hre.SDK.chainInfo.chainId,
    //                         DEPLOYMENT_NAMES.SIMPLE_LEVERAGE_EXECUTOR,
    //                         taskArgs.tag,
    //                     ).address,
    //                 ]),
    //             ],
    //             true,
    //         ]),
    //         allowFailure: false,
    //     },
    // ]);
}
