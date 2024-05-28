import {
    TTapiocaDeployerVmPass,
    TTapiocaDeployTaskArgs,
} from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

import * as TAPIOCA_PERIPH_CONFIG from '@tapioca-periph/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadGlobalContract, loadLocalContract } from 'tapioca-sdk';
import { DEPLOYMENT_NAMES } from './DEPLOY_CONFIG';

/**
 * @notice needs to be called after tapioca periph final
 * @notice Set the USDO oracle
 */
export const deployFinal__task = async (
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
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        async () => {},
        tapiocaPostDeployTask,
    );
    console.log('[+] Deployed final phase');
};

async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<unknown>) {
    const { hre, taskArgs, VM, chainInfo, tapiocaMulticallAddr } = params;
    const { tag } = taskArgs;
    const bb = await hre.ethers.getContractAt('BigBang', '');

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        loadLocalContract(hre, chainInfo.chainId, DEPLOYMENT_NAMES.PENROSE, tag)
            .address,
    );

    const usdoOracleAddy = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
        chainInfo.chainId,
        TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.USDO_USDC_UNI_V3_POOL,
        tag,
    ).address;

    const penroseExecuteMarketFnsAddys: string[] = [];
    const penroseExecuteMarketFnsData: string[] = [];

    const addBBSetConfig = async (bbMarket: string) => {
        const bbAddy = loadLocalContract(
            hre,
            chainInfo.chainId,
            bbMarket,
            tag,
        ).address;

        console.log(
            '[+] Setting USDO oracle',
            usdoOracleAddy,
            'for',
            bbMarket,
            bbAddy,
        );
        penroseExecuteMarketFnsAddys.push(bbAddy);
        penroseExecuteMarketFnsData.push(
            bb.interface.encodeFunctionData('setAssetOracle', [
                usdoOracleAddy,
                '0x',
            ]),
        );
    };

    await addBBSetConfig(DEPLOYMENT_NAMES.BB_MT_ETH_MARKET);
    await addBBSetConfig(DEPLOYMENT_NAMES.BB_T_RETH_MARKET);
    await addBBSetConfig(DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET);

    await VM.executeMulticall([
        {
            target: penrose.address,
            allowFailure: false,
            callData: penrose.interface.encodeFunctionData('executeMarketFn', [
                penroseExecuteMarketFnsAddys,
                penroseExecuteMarketFnsData,
                true,
            ]),
        },
    ]);
}
