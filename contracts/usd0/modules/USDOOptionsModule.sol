// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {ITapiocaOptionBrokerCrossChain} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {IPermitBorrow} from "tapioca-periph/interfaces/common/IPermitBorrow.sol";
import {ICommonData} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {IPermitAll} from "tapioca-periph/interfaces/common/IPermitAll.sol";
import {ISendFrom} from "tapioca-periph/interfaces/common/ISendFrom.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {BaseUSDOStorage} from "../BaseUSDOStorage.sol";
import {LzLib} from "contracts/tmp/LzLib.sol";
import {USDOCommon} from "./USDOCommon.sol";

contract USDOOptionsModule is USDOCommon {
    using SafeERC20 for IERC20;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error AllowanceNotValid();

    constructor(address _lzEndpoint, IYieldBox _yieldBox, ICluster _cluster)
        BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster)
    {}

    /// @notice exercises oTap
    /// @param optionsData oTap action data
    /// @param lzData LayerZero call data
    /// @param tapSendData tap token send data
    /// @param approvals approvals array that should be executed on destination
    /// @param revokes revokes array that should be executed on destination
    /// @param adapterParams LZ call adapter parameters
    function exerciseOption(
        ITapiocaOptionBrokerCrossChain.IExerciseOptionsData calldata optionsData,
        ITapiocaOptionBrokerCrossChain.IExerciseLZData calldata lzData,
        ITapiocaOptionBrokerCrossChain.IExerciseLZSendTapData calldata tapSendData,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes,
        bytes calldata adapterParams
    ) external payable {
        if (tapSendData.tapOftAddress != address(0)) {
            if (!cluster.isWhitelisted(lzData.lzDstChainId, tapSendData.tapOftAddress)) revert SenderNotAuthorized();
        }

        bytes32 toAddress = LzLib.addressToBytes32(optionsData.from);

        (uint256 paymentTokenAmount,) = _removeDust(optionsData.paymentTokenAmount);
        paymentTokenAmount = _debitFrom(optionsData.from, lzEndpoint.getChainId(), toAddress, paymentTokenAmount);
        if (paymentTokenAmount == 0) revert NotValid();

        (,, uint256 airdropAmount,) = LzLib.decodeAdapterParams(adapterParams);
        bytes memory lzPayload = abi.encode(
            PT_TAP_EXERCISE, _ld2sd(paymentTokenAmount), optionsData, tapSendData, approvals, revokes, airdropAmount
        );

        _checkAdapterParams(lzData.lzDstChainId, PT_TAP_EXERCISE, adapterParams, NO_EXTRA_GAS);

        _lzSend(
            lzData.lzDstChainId,
            lzPayload,
            payable(optionsData.from),
            lzData.zroPaymentAddress,
            adapterParams,
            msg.value
        );

        emit SendToChain(lzData.lzDstChainId, optionsData.from, toAddress, paymentTokenAmount);
    }
}
