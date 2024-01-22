// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {ITapiocaOptionBrokerCrossChain} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {ICommonOFT} from "tapioca-periph/layerzero/v1/token/oft/v2/ICommonOFT.sol";
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

contract USDOOptionsDestinationModule is USDOCommon {
    using SafeERC20 for IERC20;

    constructor(address _lzEndpoint, IYieldBox _yieldBox, ICluster _cluster)
        BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster)
    {}

    /// @notice destination call for USDOOptionsModule.exerciseOption
    /// @param module USDO OptionsDestination module address
    /// @param _srcChainId LayerZero source chain id
    /// @param _srcAddress LayerZero source address
    /// @param _nonce LayerZero current nonce
    /// @param _payload received payload
    function exercise(
        address module,
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) public {
        if (msg.sender != address(this)) revert SenderNotAuthorized();
        if (_moduleAddresses[Module.OptionsDestination] != module) {
            revert NotValid();
        }

        (
            ,
            uint64 amountSD,
            ITapiocaOptionBrokerCrossChain.IExerciseOptionsData memory optionsData,
            ITapiocaOptionBrokerCrossChain.IExerciseLZSendTapData memory tapSendData,
            ICommonData.IApproval[] memory approvals,
            ICommonData.IApproval[] memory revokes,
            uint256 airdropAmount
        ) = abi.decode(
            _payload,
            (
                uint16,
                uint64,
                ITapiocaOptionBrokerCrossChain.IExerciseOptionsData,
                ITapiocaOptionBrokerCrossChain.IExerciseLZSendTapData,
                ICommonData.IApproval[],
                ICommonData.IApproval[],
                uint256
            )
        );
        if (tapSendData.tapOftAddress != address(0)) {
            if (!cluster.isWhitelisted(0, tapSendData.tapOftAddress)) {
                revert SenderNotAuthorized();
            }
        }
        optionsData.paymentTokenAmount = _sd2ld(amountSD);
        uint256 balanceBefore = balanceOf(address(this));
        bool credited = creditedPackets[_srcChainId][_srcAddress][_nonce];
        if (!credited) {
            _creditTo(_srcChainId, address(this), optionsData.paymentTokenAmount);
            creditedPackets[_srcChainId][_srcAddress][_nonce] = true;
        }
        uint256 balanceAfter = balanceOf(address(this));

        (bool success, bytes memory reason) = module.delegatecall(
            abi.encodeWithSelector(
                this.exerciseInternal.selector,
                optionsData.from,
                optionsData.oTAPTokenID,
                address(this),
                optionsData.tapAmount,
                optionsData.target,
                tapSendData,
                optionsData.paymentTokenAmount,
                approvals,
                revokes,
                airdropAmount
            )
        );

        if (!success) {
            if (balanceAfter - balanceBefore >= optionsData.paymentTokenAmount) {
                IERC20(address(this)).safeTransfer(optionsData.from, optionsData.paymentTokenAmount);
            }
            _storeFailedMessage(_srcChainId, _srcAddress, _nonce, _payload, reason);
            emit CallFailedBytes(_srcChainId, _payload, reason);
        }

        emit ReceiveFromChain(_srcChainId, optionsData.from, optionsData.paymentTokenAmount);
    }

    function exerciseInternal(
        address from,
        uint256 oTAPTokenID,
        address paymentToken,
        uint256 tapAmount,
        address target,
        ITapiocaOptionBrokerCrossChain.IExerciseLZSendTapData memory tapSendData,
        uint256 paymentTokenAmount,
        ICommonData.IApproval[] memory approvals,
        ICommonData.IApproval[] memory revokes,
        uint256 airdropAmount
    ) public {
        if (msg.sender != address(this)) revert SenderNotAuthorized();

        if (approvals.length > 0) {
            _callApproval(approvals, PT_TAP_EXERCISE);
        }

        uint256 paymentTokenBalanceBefore = IERC20(paymentToken).balanceOf(address(this));
        ITapiocaOptionBrokerCrossChain(target).exerciseOption(oTAPTokenID, paymentToken, tapAmount);
        uint256 paymentTokenBalanceAfter = IERC20(paymentToken).balanceOf(address(this));

        if (paymentTokenBalanceBefore > paymentTokenBalanceAfter) {
            uint256 diff = paymentTokenBalanceBefore - paymentTokenBalanceAfter;
            if (diff < paymentTokenAmount) {
                uint256 toReturn = paymentTokenAmount - diff;
                IERC20(paymentToken).safeTransfer(from, toReturn);
            }
        }
        if (tapSendData.withdrawOnAnotherChain) {
            ISendFrom(tapSendData.tapOftAddress).sendFrom{value: airdropAmount}(
                address(this),
                tapSendData.lzDstChainId,
                LzLib.addressToBytes32(from),
                tapAmount,
                ICommonOFT.LzCallParams({
                    refundAddress: payable(from),
                    zroPaymentAddress: tapSendData.zroPaymentAddress,
                    adapterParams: LzLib.buildDefaultAdapterParams(tapSendData.extraGas)
                })
            );
        } else {
            IERC20(tapSendData.tapOftAddress).safeTransfer(from, tapAmount);
        }

        if (revokes.length > 0) {
            _callApproval(revokes, PT_TAP_EXERCISE);
        }
    }
}
