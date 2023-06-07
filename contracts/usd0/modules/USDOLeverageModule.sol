// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

//TAPIOCA
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import "tapioca-periph/contracts/interfaces/ISwapper.sol";
import "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";

import "../BaseUSDOStorage.sol";

contract USDOLeverageModule is BaseUSDOStorage {
    using SafeERC20 for IERC20;

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox) {}

    function sendForLeverage(
        uint256 amount,
        address leverageFor,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    ) external payable {
        bytes32 senderBytes = LzLib.addressToBytes32(msg.sender);
        _debitFrom(msg.sender, lzEndpoint.getChainId(), senderBytes, amount);

        bytes memory lzPayload = abi.encode(
            PT_LEVERAGE_MARKET_UP,
            senderBytes,
            amount,
            swapData,
            externalData,
            lzData,
            leverageFor
        );

        _lzSend(
            lzData.lzDstChainId,
            lzPayload,
            payable(lzData.refundAddress),
            lzData.zroPaymentAddress,
            lzData.dstAirdropAdapterParam,
            msg.value
        );
        emit SendToChain(lzData.lzDstChainId, msg.sender, senderBytes, amount);
    }

    function leverageUp(uint16 _srcChainId, bytes memory _payload) public {
        (
            ,
            ,
            uint256 amount,
            IUSDOBase.ILeverageSwapData memory swapData,
            IUSDOBase.ILeverageExternalContractsData memory externalData,
            IUSDOBase.ILeverageLZData memory lzData,
            address leverageFor
        ) = abi.decode(
                _payload,
                (
                    uint16,
                    bytes32,
                    uint256,
                    IUSDOBase.ILeverageSwapData,
                    IUSDOBase.ILeverageExternalContractsData,
                    IUSDOBase.ILeverageLZData,
                    address
                )
            );

        _creditTo(_srcChainId, address(this), amount);

        //swap from USDO
        _approve(address(this), externalData.swapper, amount);
        ISwapper.SwapData memory _swapperData = ISwapper(externalData.swapper)
            .buildSwapData(
                address(this),
                swapData.tokenOut,
                amount,
                0,
                false,
                false
            );

        (uint256 amountOut, ) = ISwapper(externalData.swapper).swap(
            _swapperData,
            swapData.amountOutMin,
            address(this),
            swapData.data
        );

        //wrap into tOFT
        IERC20(swapData.tokenOut).approve(externalData.tOft, amountOut);
        ITapiocaOFTBase(externalData.tOft).wrap(
            address(this),
            address(this),
            amountOut
        );

        //send to YB & deposit
        ITapiocaOFT.IApproval[] memory approvals;
        ITapiocaOFT(externalData.tOft).sendToYBAndBorrow{
            value: address(this).balance
        }(
            address(this),
            leverageFor,
            lzData.lzSrcChainId,
            lzData.srcAirdropAdapterParam,
            ITapiocaOFT.IBorrowParams({
                amount: amountOut,
                borrowAmount: 0,
                marketHelper: externalData.magnetar,
                market: externalData.srcMarket
            }),
            ITapiocaOFT.IWithdrawParams({
                withdraw: false,
                withdrawLzFeeAmount: 0,
                withdrawOnOtherChain: false,
                withdrawLzChainId: 0,
                withdrawAdapterParams: "0x"
            }),
            ITapiocaOFT.ISendOptions({
                extraGasLimit: lzData.srcExtraGasLimit,
                zroPaymentAddress: lzData.zroPaymentAddress
            }),
            approvals
        );
    }
}
