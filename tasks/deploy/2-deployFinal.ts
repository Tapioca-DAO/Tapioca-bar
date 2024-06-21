import {
    TTapiocaDeployerVmPass,
    TTapiocaDeployTaskArgs,
} from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

import * as TAPIOCA_PERIPH_CONFIG from '@tapioca-periph/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    createEmptyStratYbAsset__task,
    loadGlobalContract,
    loadLocalContract,
} from 'tapioca-sdk';
import { DEPLOY_CONFIG, DEPLOYMENT_NAMES } from './DEPLOY_CONFIG';
import { buildERC20WithoutStrategy } from 'tasks/deployBuilds/buildERC20WithoutStrategy';
import * as TAPIOCA_Z_CONFIG from '@tapiocaz/config';
import {
    depositSglAssetYB,
    depositUsdoYbAndAddSgl,
} from './postDepSetup/utils_seedSglAssetInYb';
import { sendOftToken } from './postDepSetup/utils_sendOftToken';
import { BigNumberish } from 'ethers';

/**
 * @notice Needs to be called from SIDE CHAIN first then HOST CHAIN
 * @notice needs to be called after tapioca periph final
 *
 * Deploy: Arb
 * - tSglSdai without strategy
 * - tSglSglp without strategy
 *
 * Post deploy: Arb, Eth
 * - Registers tSglSdai & tSglSglp asset it in the yieldbox
 * - Deposit tSglSdai & tSglSglp in the yieldbox
 * - Sets the USDO oracle in BigBang markets
 */
export const deployFinal__task = async (
    _taskArgs: TTapiocaDeployTaskArgs & {
        transferTo: string;
    },
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

async function tapiocaPostDeployTask(
    params: TTapiocaDeployerVmPass<{
        transferTo: string;
    }>,
) {
    const {
        hre,
        taskArgs,
        VM,
        chainInfo,
        tapiocaMulticallAddr,
        isHostChain,
        isSideChain,
        isTestnet,
    } = params;
    const { tag } = taskArgs;
    const bb = await hre.ethers.getContractAt('BigBang', '');

    // xChain needs to be called first
    if (isSideChain) {
        const tSglSdai = await hre.ethers.getContractAt(
            'TOFT',
            loadGlobalContract(
                hre,
                TAPIOCA_PROJECTS_NAME.TapiocaZ,
                hre.SDK.chainInfo.chainId,
                TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.T_SGL_SDAI_MARKET,
                tag,
            ).address,
        );

        const calls: TapiocaMulticall.CallStruct[] = [];
        await depositUsdoYbAndAddSgl({
            hre,
            marketName: DEPLOYMENT_NAMES.SGL_S_DAI_MARKET,
            calls,
            tag,
            multicallAddr: tapiocaMulticallAddr,
            isTestnet,
            amount: hre.ethers.utils.parseEther('0.01'),
        });
        await VM.executeMulticall(calls);

        let calls2: TapiocaMulticall.CallValueStruct[] = [];
        await wrapToft({
            calls: calls2,
            tapTakParams: params,
            toftAddr: tSglSdai.address,
            wrapAmount: hre.ethers.utils.parseEther('0.01'),
        });

        calls2 = calls2.map((c) => ({ ...c, value: 0 })); // Value property is not used in wrapToft, we need to set it
        const callValue = await sendOftToken(
            params,
            calls2,
            tSglSdai.address,
            hre.ethers.utils.parseEther('0.01'),
        );

        await VM.executeMulticallValue(calls2, {
            overrideOptions: {
                value: callValue,
            },
        });
    }

    if (isHostChain) {
        const penrose = await hre.ethers.getContractAt(
            'Penrose',
            loadLocalContract(
                hre,
                chainInfo.chainId,
                DEPLOYMENT_NAMES.PENROSE,
                tag,
            ).address,
        );

        const usdoOracleAddy = loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
            chainInfo.chainId,
            TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.USDO_USDC_UNI_V3_ORACLE,
            tag,
        ).address;

        const calls: TapiocaMulticall.CallStruct[] = [];

        // Register USDO oracle in BigBang markets
        {
            console.log('[+] Setting USDO oracle in BigBang markets');
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

            calls.push({
                target: penrose.address,
                allowFailure: false,
                callData: penrose.interface.encodeFunctionData(
                    'executeMarketFn',
                    [
                        penroseExecuteMarketFnsAddys,
                        penroseExecuteMarketFnsData,
                        true,
                    ],
                ),
            });
        }

        const { tSglSglp } = await loadContract__deployFinal__task({
            hre,
            tag,
        });

        // Register deployed tSglSdai & tSglSglp asset in yieldbox
        {
            await createEmptyStratYbAsset__task(
                {
                    deploymentName:
                        DEPLOYMENT_NAMES.YB_T_SGL_SGLP_ASSET_WITHOUT_STRATEGY,
                    tag,
                    token: tSglSglp.address,
                },
                hre,
            );

            // await createEmptyStratYbAsset__task(
            //     {
            //         deploymentName:
            //             DEPLOYMENT_NAMES.YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY,
            //         tag,
            //         token: tSglSdai.address,
            //     },
            //     hre,
            // );
        }

        // Deposit SglSdai & SglSglp assets in yieldbox
        // {
        //     await depositUsdoYbAndAddSgl({
        //         hre,
        //         marketName: DEPLOYMENT_NAMES.SGL_S_GLP_MARKET,
        //         calls,
        //         tag,
        //         multicallAddr: tapiocaMulticallAddr,
        //         isTestnet,
        //         amount: hre.ethers.utils.parseEther('5'),
        //     });

        //     await wrapToft({
        //         calls: calls,
        //         tapTakParams: params,
        //         toftAddr: tSglSglp.address,
        //         wrapAmount: hre.ethers.utils.parseEther('5'),
        //     });
        // }
        await VM.executeMulticall(calls);

        // Need to first register the assets to get the IDs
        // Deposit tSglSdai & tSglSglp in yieldbox
        {
            const calls2: TapiocaMulticall.CallStruct[] = [];
            // await depositSglAssetYB({
            //     hre,
            //     tokenAddr: tSglSglp.address,
            //     stratName:
            //         DEPLOYMENT_NAMES.YB_T_SGL_SGLP_ASSET_WITHOUT_STRATEGY,
            //     calls: calls2,
            //     tag,
            //     tapiocaMulticallAddr,
            //     isTestnet,
            //     freeMint: false,
            // });

            // await depositSglAssetYB({
            //     hre,
            //     tokenAddr: tSglSdai.address,
            //     stratName:
            //         DEPLOYMENT_NAMES.YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY,
            //     calls: calls2,
            //     tag,
            //     tapiocaMulticallAddr,
            //     isTestnet,
            //     freeMint: false,
            // });

            await VM.executeMulticall(calls2);
        }
    }
}

export async function wrapToft(params: {
    tapTakParams: TTapiocaDeployerVmPass<any>;
    calls: TapiocaMulticall.CallStruct[];
    toftAddr: string;
    wrapAmount: BigNumberish;
}) {
    const { calls, tapTakParams, toftAddr, wrapAmount } = params;
    const { hre, tapiocaMulticallAddr, taskArgs } = tapTakParams;
    const { tag } = taskArgs;

    const pearlmit = await hre.ethers.getContractAt(
        'Pearlmit',
        loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.TapiocaPeriph,
            hre.SDK.eChainId,
            TAPIOCA_PERIPH_CONFIG.DEPLOYMENT_NAMES.PEARLMIT,
            tag,
        ).address,
    );

    const blockTimestamp = await (
        await hre.ethers.provider.getBlock('latest')
    ).timestamp;
    const toft = await hre.ethers.getContractAt('TOFT', toftAddr);
    const erc20Addr = await toft.erc20();
    const erc20 = await hre.ethers.getContractAt('ERC20Mock', erc20Addr);

    console.log('[+] Wrapping toft token', wrapAmount.toString());
    const balance = await erc20.balanceOf(tapiocaMulticallAddr);
    if (balance.eq(0)) {
        // throw new Error(`[-] No balance to wrap ${balance}`);
    }

    calls.push(
        {
            target: erc20Addr,
            callData: erc20.interface.encodeFunctionData('approve', [
                pearlmit.address,
                wrapAmount,
            ]),
            allowFailure: false,
        },
        {
            target: pearlmit.address,
            callData: pearlmit.interface.encodeFunctionData('approve', [
                20,
                erc20Addr,
                0,
                toft.address,
                wrapAmount,
                blockTimestamp + 1800,
            ]),
            allowFailure: false,
        },
        {
            target: toft.address,
            callData: toft.interface.encodeFunctionData('wrap', [
                tapiocaMulticallAddr,
                tapiocaMulticallAddr,
                wrapAmount,
            ]),
            allowFailure: false,
        },
    );
}

async function loadContract__deployFinal__task(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;
    // const tSglSdai = loadGlobalContract(
    //     hre,
    //     TAPIOCA_PROJECTS_NAME.TapiocaZ,
    //     hre.SDK.chainInfo.chainId,
    //     TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.T_SGL_SDAI_MARKET,
    //     tag,
    // );
    const tSglSglp = loadGlobalContract(
        hre,
        TAPIOCA_PROJECTS_NAME.TapiocaZ,
        hre.SDK.chainInfo.chainId,
        TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.T_SGL_GLP_MARKET,
        tag,
    );

    return { tSglSglp };
}
