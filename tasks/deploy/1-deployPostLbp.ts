import * as TAP_TOKEN_CONFIG from '@tap-token/config';
import * as TAPIOCA_PERIPH_CONFIG from '@tapioca-periph/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TTapiocaDeployTaskArgs } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadGlobalContract } from 'tapioca-sdk';
import { TTapiocaDeployerVmPass } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { buildBBMediumRiskMC } from 'tasks/deployBuilds/buildBBMediumRiskMC';
import { buildPenrose } from 'tasks/deployBuilds/buildPenrose';
import { buildSGLMediumRiskMC } from 'tasks/deployBuilds/buildSGLMediumRiskMC';
import { buildSGLModules } from 'tasks/deployBuilds/buildSGLModules';
import { buildUSDO } from 'tasks/deployBuilds/buildUSDO';
import { buildUSDOModules } from 'tasks/deployBuilds/buildUSDOModules';
import { DEPLOYMENT_NAMES } from './DEPLOY_CONFIG';
import { buildUSDOExtExec } from 'tasks/deployBuilds/buildUSDOExtExec';
import { buildUSDOFlashloanHelper } from 'tasks/deployBuilds/buildUSDOFlashloanHelper';
import { buildSimpleLeverageExecutor } from 'tasks/deployBuilds/buildSimpleLeverageExecutor';

export const deployPostLbp__task = async (
    _taskArgs: TTapiocaDeployTaskArgs,
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

    const { tapToken, yieldBox, cluster, pearlmit, zeroXSwapper } =
        loadDeployments({
            hre,
            tag,
        });

    if (
        chainInfo.name === 'arbitrum' ||
        chainInfo.name === 'arbitrum_sepolia'
    ) {
        // @ts-ignore
        (await buildSGLModules(hre)).forEach((module) => VM.add(module));
        // @ts-ignore
        (await buildBBModules(hre)).forEach((module) => VM.add(module));
        VM.add(
            await buildPenrose(hre, {
                yieldBox,
                cluster,
                tapToken,
                pearlmit,
                owner,
            }),
        )
            .add(await buildSGLMediumRiskMC(hre))
            .add(await buildBBMediumRiskMC(hre));
    }

    // @ts-ignore
    (await buildUSDOModules(hre)).forEach((module) => VM.add(module));

    VM.add(await buildUSDOExtExec(hre, { cluster, owner }))
        .add(
            await buildSimpleLeverageExecutor(hre, {
                cluster,
                zeroXSwapper,
                tag,
            }),
        )
        .add(
            await buildUSDO(
                hre,
                {
                    initData: {
                        endpoint: chainInfo.address,
                        delegate: owner,
                        extExec: '0x',
                        cluster,
                        pearlmit,
                        yieldBox,
                    },
                    modules: {
                        marketReceiverModule: '0x',
                        optionReceiverModule: '0x',
                        usdoReceiverModule: '0x',
                        usdoSenderModule: '0x',
                    },
                },
                [
                    {
                        argPosition: 0,
                        keyName: 'extExec',
                        deploymentName: DEPLOYMENT_NAMES.USDO_EXT_EXEC,
                    },
                    {
                        argPosition: 1,
                        keyName: 'marketReceiverModule',
                        deploymentName:
                            DEPLOYMENT_NAMES.USDO_MARKET_RECEIVER_MODULE,
                    },
                    {
                        argPosition: 1,
                        keyName: 'optionReceiverModule',
                        deploymentName:
                            DEPLOYMENT_NAMES.USDO_OPTION_RECEIVER_MODULE,
                    },
                    {
                        argPosition: 1,
                        keyName: 'usdoReceiverModule',
                        deploymentName: DEPLOYMENT_NAMES.USDO_RECEIVER_MODULE,
                    },
                    {
                        argPosition: 1,
                        keyName: 'usdoSenderModule',
                        deploymentName: DEPLOYMENT_NAMES.USDO_SENDER_MODULE,
                    },
                ],
            ),
        )
        .add(
            await buildUSDOFlashloanHelper(hre, { usdo: '0x', owner }, [
                {
                    argPosition: 0,
                    deploymentName: DEPLOYMENT_NAMES.USDO,
                },
            ]),
        );
}

function loadDeployments(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;
    const tapToken = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapToken,
        hre.SDK.eChainId,
        TAP_TOKEN_CONFIG.DEPLOYMENT_NAMES.TAP_TOKEN,
        tag,
    ).address;
    const yieldBox = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapToken,
        hre.SDK.eChainId,
        TAP_TOKEN_CONFIG.DEPLOYMENT_NAMES.TAP_TOKEN,
        tag,
    ).address;
    const cluster = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.CLUSTER,
        tag,
    ).address;
    const pearlmit = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.PEARLMIT,
        tag,
    ).address;

    const zeroXSwapper = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        hre.SDK.eChainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.ZERO_X_SWAPPER,
        params.tag,
    ).address;

    return { tapToken, yieldBox, cluster, pearlmit, zeroXSwapper };
}
