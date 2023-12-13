// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

//TAPIOCA
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import "tapioca-periph/contracts/interfaces/ISingularity.sol";

import "./USDOCommon.sol";

contract USDOLeverageModule is USDOCommon {
    using SafeERC20 for IERC20;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error AllowanceNotValid();
    error AmountTooLow();

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        ICluster _cluster
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster) {}

    function sendForLeverage(
        uint256 amount,
        address leverageFor,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    ) external payable {
        if (swapData.tokenOut == address(this)) revert NotValid();
        _assureMaxSlippage(amount, swapData.amountOutMin);
        if (externalData.swapper != address(0)) {
            if (
                !cluster.isWhitelisted(
                    lzData.lzDstChainId,
                    externalData.swapper
                )
            ) revert SwapperNotAuthorized();
        }
        bytes32 senderBytes = LzLib.addressToBytes32(leverageFor);
        (amount, ) = _removeDust(amount);
        amount = _debitFrom(
            leverageFor,
            lzEndpoint.getChainId(),
            senderBytes,
            amount
        );
        if (amount == 0) revert NotValid();

        (, , uint256 airdropAmount, ) = LzLib.decodeAdapterParams(
            lzData.dstAirdropAdapterParam
        );
        bytes memory lzPayload = abi.encode(
            PT_LEVERAGE_MARKET_UP,
            _ld2sd(amount),
            swapData,
            externalData,
            lzData,
            leverageFor,
            airdropAmount
        );

        _checkAdapterParams(
            lzData.lzDstChainId,
            PT_LEVERAGE_MARKET_UP,
            lzData.dstAirdropAdapterParam,
            NO_EXTRA_GAS
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

    function _assureMaxSlippage(
        uint256 amount,
        uint256 minAmount
    ) internal pure {
        uint256 slippageMinAmount = amount -
            ((SWAP_MAX_SLIPPAGE * amount) / SLIPPAGE_PRECISION);
        if (minAmount < slippageMinAmount) revert AmountTooLow();
    }
}
