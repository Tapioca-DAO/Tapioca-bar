import * as TAP_YIELDBOX_CONFIG from '@tap-yieldbox/config';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TTapiocaDeployTaskArgs } from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import * as TAPIOCA_Z_CONFIG from '@tapiocaz/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadGlobalContract, loadLocalContract } from 'tapioca-sdk';
import { TTapiocaDeployerVmPass } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from './DEPLOY_CONFIG';
import { mintOriginUSDO__setupOriginsBorrowUSDO } from './postDepSetup/2-setupOriginsMintUSDO';
import { SendParamStruct } from '@typechain/contracts/usdo/Usdo';

/**
 * Mint USDO against ETH on Origin for USDC pool
 * Mint USDO against ETH on Origin for DAI pool
 * Transfer USDO to Ethereum for the DAI pool
 *
 * Call Periph will to deploy the USDO pools
 */
export const postLbp3__deployMintOriginUSDO__task = async (
    _taskArgs: TTapiocaDeployTaskArgs,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deployed Post LBP phase 1');
    await hre.SDK.DeployerVM.tapiocaDeployTask(
        _taskArgs,
        { hre },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        async () => {},
        tapiocaPostDeployTask,
    );
    console.log('[+] Deployed USDO pools');
};

async function tapiocaPostDeployTask(params: TTapiocaDeployerVmPass<object>) {
    const { hre, taskArgs, VM, chainInfo, tapiocaMulticallAddr } = params;
    const { tag } = taskArgs;

    const { usdo, origins } = await loadContracts__mintOriginUSDO({ hre, tag });

    const calls: TapiocaMulticall.CallStruct[] = [];

    const ETH_AMOUNT_FOR_USDC =
        DEPLOY_CONFIG.USDO_UNISWAP_POOL[chainInfo.chainId]!
            .USDC_BORROW_COLLATERAL_ETH_AMOUNT!;
    const ETH_AMOUNT_FOR_DAI =
        DEPLOY_CONFIG.USDO_UNISWAP_POOL[chainInfo.chainId]!
            .DAI_BORROW_COLLATERAL_ETH_AMOUNT!;

    if (ETH_AMOUNT_FOR_USDC.isZero() || ETH_AMOUNT_FOR_DAI.isZero()) {
        throw new Error(
            '[-] Skipping USDO minting as the collateral amount is 0. Check CONFIG file',
        );
    }

    const exchangeRate = await origins._exchangeRate();
    console.log(
        `[+] Exchange rate: ${hre.ethers.utils.formatUnits(
            ETH_AMOUNT_FOR_USDC,
            'ether',
        )}`,
    );

    const borrowAmountForUSDC = ETH_AMOUNT_FOR_USDC.mul(exchangeRate).div(1e18);
    const borrowAmountForDAI = ETH_AMOUNT_FOR_DAI.mul(exchangeRate).div(1e18);

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
            ...(await mintOriginUSDO__setupOriginsBorrowUSDO({
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
            ...(await mintOriginUSDO__setupOriginsBorrowUSDO({
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
    {
        let chainName;
        if (chainInfo.name === 'arbitrum_sepolia') {
            console.log('[+] Transferring USDO to Sepolia for the DAI pool');
            chainName = 'sepolia';
        } else {
            console.log('[+] Transferring USDO to Ethereum for the DAI pool');
            chainName = 'ethereum';
        }

        const tapiocaMulticallTargetChain = hre.SDK.db.findGlobalDeployment(
            TAPIOCA_PROJECTS_NAME.Generic, //generic
            hre.SDK.utils.getChainBy('name', chainName).chainId,
            hre.SDK.DeployerVM.TAPIOCA_MULTICALL_NAME,
            tag,
        );
        if (!tapiocaMulticallTargetChain) {
            throw new Error(
                `[-] Could not find a tapioca multicall contract on ${chainName} tag ${tag}`,
            );
        }

        const sendData: SendParamStruct = {
            amountLD: borrowAmountForDAI,
            minAmountLD: borrowAmountForDAI,
            to: tapiocaMulticallTargetChain.address,
            dstEid: hre.SDK.utils.getChainBy('name', chainName).lzChainId,
            extraOptions: '0x',
            composeMsg: '0x',
            oftCmd: '0x',
        };

        const usdoQuoteSend = await usdo.quoteSend(sendData, false);
        console.log(
            '[+] Sending',
            hre.ethers.utils.formatUnits(borrowAmountForDAI, 'ether'),
            'USDO',
        );
        console.log(
            '[+] Quote for sending USDO:',
            hre.ethers.utils.formatUnits(usdoQuoteSend.nativeFee, 'ether'),
        );

        calls.push({
            target: usdo.address,
            allowFailure: false,
            callData: usdo.interface.encodeFunctionData('send', [
                sendData,
                { lzTokenFee: 0, nativeFee: usdoQuoteSend.nativeFee },
                tapiocaMulticallAddr,
            ]),
        });
    }
}

export async function loadContracts__mintOriginUSDO(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
}) {
    const { hre, tag } = params;

    const origins = await hre.ethers.getContractAt(
        'Origins',
        loadLocalContract(
            hre,
            hre.SDK.eChainId,
            DEPLOYMENT_NAMES.ORIGINS_MT_ETH_MARKET,
            tag,
        ).address,
    );

    const usdo = await hre.ethers.getContractAt(
        'Usdo',
        loadLocalContract(hre, hre.SDK.eChainId, DEPLOYMENT_NAMES.USDO, tag)
            .address,
    );

    const yieldBox = await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.YieldBox,
            hre.SDK.eChainId,
            TAP_YIELDBOX_CONFIG.DEPLOYMENT_NAMES.YieldBox,
            tag,
        ).address,
    );

    const mtETH = await hre.ethers.getContractAt(
        'ITOFT',
        loadGlobalContract(
            hre,
            TAPIOCA_PROJECTS_NAME.TapiocaZ,
            hre.SDK.eChainId,
            TAPIOCA_Z_CONFIG.DEPLOYMENT_NAMES.mtETH,
            tag,
        ).address,
    );

    return {
        origins,
        yieldBox,
        mtETH,
        usdo,
    };
}
