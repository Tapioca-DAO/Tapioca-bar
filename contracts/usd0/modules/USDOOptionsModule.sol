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

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        ICluster _cluster
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster) {}

    function exerciseOption(
        ITapiocaOptionsBrokerCrossChain.IExerciseOptionsData
            calldata optionsData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZData calldata lzData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZSendTapData
            calldata tapSendData,
        ICommonData.IApproval[] calldata approvals,
        bytes calldata adapterParams
    ) external payable {
        if (tapSendData.tapOftAddress != address(0)) {
            require(
                cluster.isWhitelisted(
                    lzData.lzDstChainId,
                    tapSendData.tapOftAddress
                ),
                "USDO: not authorized"
            ); //fail fast
        }

        // allowance is also checked on SGL
        // check it here as well because tokens are moved over layers
        if (optionsData.from != msg.sender) {
            require(
                allowance(optionsData.from, msg.sender) >=
                    optionsData.paymentTokenAmount,
                "UDSO: sender not approved"
            );
            _spendAllowance(
                optionsData.from,
                msg.sender,
                optionsData.paymentTokenAmount
            );
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
        require(paymentTokenAmount > 0, "TOFT_AMOUNT");

        (, , uint256 airdropAmount, ) = LzLib.decodeAdapterParams(
            adapterParams
        );
        bytes memory lzPayload = abi.encode(
            PT_TAP_EXERCISE,
            _ld2sd(paymentTokenAmount),
            optionsData,
            tapSendData,
            approvals,
            airdropAmount
        );

        _checkAdapterParams(
            lzData.lzDstChainId,
            PT_TAP_EXERCISE,
            adapterParams,
            NO_EXTRA_GAS
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
            optionsData.paymentTokenAmount
        );
    }
}
