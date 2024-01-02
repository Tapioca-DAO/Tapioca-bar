// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

//TAPIOCA
import "tapioca-periph/contracts/interfaces/IPermitBorrow.sol";
import "tapioca-periph/contracts/interfaces/IPermitAll.sol";
import "tapioca-periph/contracts/interfaces/ITapiocaOptionsBroker.sol";
import "tapioca-periph/contracts/interfaces/ISendFrom.sol";
import "tapioca-periph/contracts/interfaces/ISingularity.sol";

import "./USDOCommon.sol";

contract USDOOptionsModule is USDOCommon {
    using SafeERC20 for IERC20;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error AllowanceNotValid();

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        ICluster _cluster
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster) {}

    /// @notice exercises oTap
    /// @param optionsData oTap action data
    /// @param lzData LayerZero call data
    /// @param tapSendData tap token send data
    /// @param approvals approvals array that should be executed on destination
    /// @param revokes revokes array that should be executed on destination
    /// @param adapterParams LZ call adapter parameters
    function exerciseOption(
        ITapiocaOptionsBrokerCrossChain.IExerciseOptionsData
            calldata optionsData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZData calldata lzData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZSendTapData
            calldata tapSendData,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes,
        bytes calldata adapterParams
    ) external payable {
        if (tapSendData.tapOftAddress != address(0)) {
            if (
                !cluster.isWhitelisted(
                    lzData.lzDstChainId,
                    tapSendData.tapOftAddress
                )
            ) revert SenderNotAuthorized();
        }

        bytes32 toAddress = LzLib.addressToBytes32(optionsData.from);

        (uint256 paymentTokenAmount, ) = _removeDust(
            optionsData.paymentTokenAmount
        );
        paymentTokenAmount = _debitFrom(
            optionsData.from,
            lzEndpoint.getChainId(),
            toAddress,
            paymentTokenAmount
        );
        if (paymentTokenAmount == 0) revert NotValid();

        (, , uint256 airdropAmount, ) = LzLib.decodeAdapterParams(
            adapterParams
        );
        bytes memory lzPayload = abi.encode(
            PT_TAP_EXERCISE,
            _ld2sd(paymentTokenAmount),
            optionsData,
            tapSendData,
            approvals,
            revokes,
            airdropAmount
        );

        _checkAdapterParams(
            lzData.lzDstChainId,
            PT_TAP_EXERCISE,
            adapterParams,
            lzData.extraGas
        );

        _lzSend(
            lzData.lzDstChainId,
            lzPayload,
            payable(optionsData.from),
            lzData.zroPaymentAddress,
            adapterParams,
            msg.value
        );

        emit SendToChain(
            lzData.lzDstChainId,
            optionsData.from,
            toAddress,
            paymentTokenAmount
        );
    }
}
