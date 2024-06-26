import { Options } from '@layerzerolabs/lz-v2-utilities';
import { TAPIOCA_PROJECTS_NAME } from '@tapioca-sdk/api/config';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { LZSendParamStruct } from '@typechain/contracts/usdo/Usdo';
import { SendParamStruct } from '@typechain/tapiocaz/tOFT/TOFT';
import { BigNumberish } from 'ethers';
import { checkExists } from 'tapioca-sdk';
import { TTapiocaDeployerVmPass } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

/**
 * @notice - Deposit USDO and add SGL asset in YieldBox
 */
export async function sendOftToken(
    params: TTapiocaDeployerVmPass<{ transferTo: string }>,
    calls: TapiocaMulticall.CallValueStruct[],
    toftAddr: string,
    amount: BigNumberish,
) {
    const {
        hre,
        taskArgs,
        VM,
        chainInfo,
        tapiocaMulticallAddr,
        isHostChain,
        isSideChain,
    } = params;
    const { tag, transferTo } = taskArgs;

    let msgValue = hre.ethers.BigNumber.from(0);

    const dstChainInfo = hre.SDK.utils.getChainBy('name', taskArgs.transferTo);

    const toft = await hre.ethers.getContractAt('Usdo', toftAddr);

    console.log(
        '[+] Loading TapiocaMulticall from',
        dstChainInfo.name,
        'tag',
        tag,
    );
    const tapiocaMulticallTargetChain = checkExists(
        hre,
        hre.SDK.db.findGlobalDeployment(
            TAPIOCA_PROJECTS_NAME.Generic,
            dstChainInfo.chainId,
            hre.SDK.DeployerVM.TAPIOCA_MULTICALL_NAME,
            tag,
        ),
        hre.SDK.DeployerVM.TAPIOCA_MULTICALL_NAME,
        TAPIOCA_PROJECTS_NAME.Generic,
    );
    const minAmountLD = await toft.removeDust(amount);

    const sendData: SendParamStruct = {
        amountLD: amount,
        minAmountLD,
        to: '0x'.concat(
            tapiocaMulticallTargetChain.address
                .split('0x')[1]
                .padStart(64, '0'),
        ),
        dstEid: dstChainInfo.lzChainId,
        extraOptions: Options.newOptions()
            .addExecutorLzReceiveOption(500_000)
            .toHex(),
        composeMsg: '0x',
        oftCmd: '0x',
    };

    const toftQuoteSend = await toft.quoteSend(sendData, false);
    console.log(
        '[+] Sending',
        hre.ethers.utils.formatUnits(amount, 'ether'),
        await toft.name(),
        'min amount out: ',
        hre.ethers.utils.formatUnits(minAmountLD, 'ether'),
    );
    console.log(
        '[+] Sending quote:',
        hre.ethers.utils.formatUnits(toftQuoteSend.nativeFee, 'ether'),
    );
    console.log('[+] To address', tapiocaMulticallTargetChain.address);

    const feeAmount = toftQuoteSend.nativeFee;

    const lzSendParam: LZSendParamStruct = {
        fee: {
            lzTokenFee: 0,
            nativeFee: feeAmount,
        },
        extraOptions: sendData.extraOptions,
        refundAddress: tapiocaMulticallAddr,
        sendParam: sendData,
    };
    calls.push({
        target: toft.address,
        allowFailure: false,
        callData: toft.interface.encodeFunctionData('sendPacket', [
            lzSendParam,
            '0x',
        ]),
        value: feeAmount,
    });
    msgValue = feeAmount;

    return msgValue;
}
