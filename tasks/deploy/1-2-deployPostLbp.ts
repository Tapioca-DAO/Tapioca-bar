import {
    TTapiocaDeployerVmPass,
    TTapiocaDeployTaskArgs,
} from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

import * as TAP_YIELDBOX_CONFIG from '@tap-yieldbox/config';
import * as TAPIOCA_PERIPH_CONFIG from '@tapioca-periph/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import * as TAPIOCA_Z_CONFIG from '@tapiocaz/config';
import { SendParamStruct } from '@typechain/contracts/usdo/Usdo';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    checkExists,
    loadGlobalContract,
    loadLocalContract,
} from 'tapioca-sdk';
import { buildOrigins } from 'tasks/deployBuilds/buildOrigins';
import { deploy__LoadDeployments_Arb } from './1-1-deployPostLbp';
import { DEPLOY_CONFIG, DEPLOYMENT_NAMES } from './DEPLOY_CONFIG';
import { mintOriginUSDO__deployPostLbp_2 } from './postDepSetup/1-2-setupOriginsMintUSDO';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { IYieldBox } from '@typechain/index';

/**
 * @notice Called after Bar `postLbp1`
 * Deploy the tETH origin contract. This contracts uses native ETH on Arb, and mock tWETH on testnet.
 *
 * Post deploy:
 * - Sets Origin as minter in USDO.
 * - Mint USDO on Origin for the USDC and DAI pools.
 * - Transfer USDO to Ethereum for the DAI pool.
 */
export const deployPostLbp__task_2 = async (
    _taskArgs: TTapiocaDeployTaskArgs & { delta: string },
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

async function tapiocaDeployTask(
    params: TTapiocaDeployerVmPass<{ delta: string }>,
) {
    const { hre, VM, tapiocaMulticallAddr, taskArgs, isTestnet, chainInfo } =
        params;
    const { tag } = taskArgs;
    const owner = tapiocaMulticallAddr;

    const { yieldBox, tETH, ethMarketOracle } = deploy__LoadDeployments_Arb({
        hre,
        tag,
    });

    const usdo = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.USDO,
        tag,
    );
    const usdoStrategy = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
        tag,
    );
    const tEthStrategy = loadLocalContract(
        hre,
        hre.SDK.eChainId,
        DEPLOYMENT_NAMES.YB_T_ETH_ASSET_WITHOUT_STRATEGY,
        tag,
    );

    console.log(usdoStrategy.address);

    if (
        chainInfo.name === 'arbitrum' ||
        chainInfo.name === 'arbitrum_sepolia'
    ) {
        VM.add(
            await buildOrigins(hre, {
                asset: usdo.address,
                assetStrategy: usdoStrategy.address,
                collateral: tETH,
                collateralStrategy: tEthStrategy.address,
                collateralizationRate:
                    DEPLOY_CONFIG.POST_LBP[hre.SDK.eChainId]!
                        .tEthOriginsMarketConfig!.collateralizationRate,
                deploymentName: DEPLOYMENT_NAMES.ORIGINS_T_ETH_MARKET,
                oracle: ethMarketOracle,
                owner,
                yieldBox,
            }),
        );
    }
}

async function tapiocaPostDeployTask(
    params: TTapiocaDeployerVmPass<{ delta: string }>,
) {
    const { hre, taskArgs, VM, chainInfo, tapiocaMulticallAddr } = params;
    const { tag, delta } = taskArgs;

    const { usdo, origins } = await loadContracts__deployPostLbp__task_2({
        hre,
        tag,
    });

    const calls: TapiocaMulticall.CallValueStruct[] = [];

    /**
     * Set Origin as minter in USDO
     */
    // usdo.setMinterStatus(origins.address, true);
    // usdo.setBurnerStatus(origins.address, true);
    calls.push(
        ...[
            {
                target: usdo.address,
                allowFailure: false,
                callData: usdo.interface.encodeFunctionData('setMinterStatus', [
                    origins.address,
                    true,
                ]),
                value: 0,
            },
            {
                target: usdo.address,
                allowFailure: false,
                callData: usdo.interface.encodeFunctionData('setBurnerStatus', [
                    origins.address,
                    true,
                ]),
                value: 0,
            },
        ],
    );

    /**
     * Mint USDO on Origin for the USDC and DAI pools
     */
    const ETH_AMOUNT_FOR_USDC =
        DEPLOY_CONFIG.USDO_UNISWAP_POOL[chainInfo.chainId]!
            .ETH_AMOUNT_TO_MINT_FOR_USDC_POOL!;
    const ETH_AMOUNT_FOR_DAI =
        DEPLOY_CONFIG.USDO_UNISWAP_POOL[chainInfo.chainId]!
            .ETH_AMOUNT_TO_MINT_FOR_DAI_POOL!;

    if (ETH_AMOUNT_FOR_USDC.isZero() || ETH_AMOUNT_FOR_DAI.isZero()) {
        throw new Error(
            '[-] Skipping USDO minting as the collateral amount is 0. Check CONFIG file',
        );
    }

    const exchangeRate = await origins._exchangeRate();
    console.log(
        `[+] Exchange rate of USD/tETH: ${hre.ethers.utils.formatEther(
            exchangeRate,
        )}`,
    );

    let borrowAmountForUSDC = hre.ethers.BigNumber.from(10)
        .pow(36)
        .div(exchangeRate)
        .mul(ETH_AMOUNT_FOR_USDC)
        .div((1e18).toString()); // Convert rate from USD/tETH to tETH/USD, then multiply by ETH amount
    borrowAmountForUSDC = borrowAmountForUSDC.sub(
        borrowAmountForUSDC.mul(delta).div(100),
    );
    let borrowAmountForDAI = hre.ethers.BigNumber.from(10)
        .pow(36)
        .div(exchangeRate)
        .mul(ETH_AMOUNT_FOR_DAI)
        .div((1e18).toString()); // Convert rate from USD/tETH to tETH/USD, then multiply by ETH amount
    borrowAmountForDAI = borrowAmountForDAI.sub(
        borrowAmountForDAI.mul(delta).div(100),
    );

    /***
     * Mint USDO on Origin
     */
    {
        // Mint USDO with ETH for USDC pool on Arb
        console.log(
            '[+] Borrowing USDO against ETH for USDC pool using',
            hre.ethers.utils.formatUnits(ETH_AMOUNT_FOR_USDC, 'ether'),
            'ETH as collateral and borrowing',
            hre.ethers.utils.formatUnits(borrowAmountForUSDC, 'ether'),
            'USDO',
        );

        calls.push(
            ...(await mintOriginUSDO__deployPostLbp_2({
                hre,
                tag,
                multicallAddr: tapiocaMulticallAddr,
                collateralAmount: ETH_AMOUNT_FOR_USDC,
                borrowAmount: borrowAmountForUSDC,
            })),
        );

        // Mint USDO with ETH for DAI pool on mainnet
        console.log(
            '[+] Borrowing USDO against ETH for DAI pool using',
            hre.ethers.utils.formatUnits(ETH_AMOUNT_FOR_DAI, 'ether'),
            'ETH as collateral and borrowing',
            hre.ethers.utils.formatUnits(borrowAmountForDAI, 'ether'),
            'USDO',
        );

        calls.push(
            ...(await mintOriginUSDO__deployPostLbp_2({
                hre,
                tag,
                multicallAddr: tapiocaMulticallAddr,
                collateralAmount: ETH_AMOUNT_FOR_DAI,
                borrowAmount: borrowAmountForDAI,
            })),
        );
    }

    /**
     *  Transfer USDO to Ethereum for the DAI pool
     */
    let msgValue = hre.ethers.BigNumber.from(0);
    {
        let chainName;
        if (chainInfo.name === 'arbitrum_sepolia') {
            console.log(
                '[+] Transferring USDO to Optimism Sep for the DAI pool',
            );
            chainName = 'optimism_sepolia';
        } else if (chainInfo.name === 'arbitrum') {
            console.log('[+] Transferring USDO to Ethereum for the DAI pool');
            chainName = 'ethereum';
        } else {
            throw new Error('Not implemented');
        }

        console.log('[+] Loading TapiocaMulticall from', chainName, 'tag', tag);
        const tapiocaMulticallTargetChain = checkExists(
            hre,
            hre.SDK.db.findGlobalDeployment(
                TAPIOCA_PROJECTS_NAME.Generic,
                hre.SDK.utils.getChainBy('name', chainName).chainId,
                hre.SDK.DeployerVM.TAPIOCA_MULTICALL_NAME,
                tag,
            ),
            hre.SDK.DeployerVM.TAPIOCA_MULTICALL_NAME,
            TAPIOCA_PROJECTS_NAME.Generic,
        );
        const minAmountLD = await usdo.removeDust(borrowAmountForDAI);

        const sendData: SendParamStruct = {
            amountLD: borrowAmountForDAI,
            minAmountLD,
            to: '0x'.concat(
                tapiocaMulticallTargetChain.address
                    .split('0x')[1]
                    .padStart(64, '0'),
            ),
            dstEid: hre.SDK.utils.getChainBy('name', chainName).lzChainId,
            extraOptions: Options.newOptions()
                .addExecutorLzReceiveOption(200_000)
                .toHex(),
            composeMsg: '0x',
            oftCmd: '0x',
        };

        const usdoQuoteSend = await usdo.callStatic.quoteSend(sendData, false);
        console.log(
            '[+] Sending',
            hre.ethers.utils.formatUnits(borrowAmountForDAI, 'ether'),
            'USDO',
            'min amount out: ',
            hre.ethers.utils.formatUnits(minAmountLD, 'ether'),
        );
        console.log(
            '[+] Quote for sending USDO:',
            hre.ethers.utils.formatUnits(usdoQuoteSend.nativeFee, 'ether'),
        );
        console.log('[+] To address', tapiocaMulticallTargetChain.address);

        calls.push({
            target: usdo.address,
            allowFailure: false,
            callData: usdo.interface.encodeFunctionData('send', [
                sendData,
                { lzTokenFee: 0, nativeFee: usdoQuoteSend.nativeFee },
                tapiocaMulticallAddr,
            ]),
            value: usdoQuoteSend.nativeFee,
        });
        msgValue = usdoQuoteSend.nativeFee;
    }
    await VM.executeMulticallValue(calls, {
        overrideOptions: { value: msgValue },
    });
}

export async function loadContracts__deployPostLbp__task_2(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;

    const origins = await hre.ethers.getContractAt(
        'Origins',
        loadLocalContract(
            hre,
            hre.SDK.eChainId,
            DEPLOYMENT_NAMES.ORIGINS_T_ETH_MARKET,
            tag,
        ).address,
    );

    const usdo = await hre.ethers.getContractAt(
        'Usdo',
        loadLocalContract(hre, hre.SDK.eChainId, DEPLOYMENT_NAMES.USDO, tag)
            .address,
    );

    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.YieldBox,
            hre.SDK.eChainId,
            TAP_YIELDBOX_CONFIG.DEPLOYMENT_NAMES.YieldBox,
            tag,
        ).address,
    )) as IYieldBox;

    const tETH = await hre.ethers.getContractAt(
        'ITOFT',
        loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.TapiocaZ,
            hre.SDK.eChainId,
            TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.tETH,
            tag,
        ).address,
    );

    return {
        origins,
        yieldBox,
        tETH,
        usdo,
    };
}
