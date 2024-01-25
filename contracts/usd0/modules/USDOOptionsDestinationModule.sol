// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {
    ITapiocaOptionBrokerCrossChain,
    ITapiocaOptionBroker
} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {ICommonOFT} from "tapioca-periph/interfaces/common/ICommonOFT.sol";
import {IPermitBorrow} from "tapioca-periph/interfaces/common/IPermitBorrow.sol";
import {ICommonData} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {IPermitAll} from "tapioca-periph/interfaces/common/IPermitAll.sol";
import {ISendFrom} from "tapioca-periph/interfaces/common/ISendFrom.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {BaseUSDOStorage} from "../BaseUSDOStorage.sol";
import {LzLib} from "contracts/tmp/LzLib.sol";
import {USDOCommon} from "./USDOCommon.sol";

contract USDOOptionsDestinationModule is USDOCommon {
    using SafeERC20 for IERC20;

    constructor(address _lzEndpoint, IYieldBox _yieldBox, ICluster _cluster)
        BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster)
    {}

    struct _ExerciseData {
        uint16 srcChainId;
        uint64 amountSD;
        ITapiocaOptionBrokerCrossChain.IExerciseOptionsData optionsData;
        ITapiocaOptionBrokerCrossChain.IExerciseLZSendTapData tapSendData;
        ICommonData.IApproval[] approvals;
        ICommonData.IApproval[] revokes;
        uint256 airdropAmount;
    }
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

        _ExerciseData memory _data = abi.decode(_payload, (_ExerciseData));
        if (_data.tapSendData.tapOftAddress != address(0)) {
            if (!cluster.isWhitelisted(0, _data.tapSendData.tapOftAddress)) {
                revert SenderNotAuthorized();
            }
        }
        _data.optionsData.paymentTokenAmount = _sd2ld(_data.amountSD);
        uint256 balanceBefore = balanceOf(address(this));
        {
            bool credited = creditedPackets[_srcChainId][_srcAddress][_nonce];
            if (!credited) {
                _creditTo(_srcChainId, address(this), _data.optionsData.paymentTokenAmount);
                creditedPackets[_srcChainId][_srcAddress][_nonce] = true;
            }
        }
        uint256 balanceAfter = balanceOf(address(this));

        (bool success, bytes memory reason) = module.delegatecall(
            abi.encodeWithSelector(
                this.exerciseInternal.selector,
                ExerciseInternalCalldata({
                    from: _data.optionsData.from,
                    oTAPTokenID: _data.optionsData.oTAPTokenID,
                    paymentToken: address(this),
                    tapAmount: _data.optionsData.tapAmount,
                    target: _data.optionsData.target,
                    tapSendData: _data.tapSendData,
                    paymentTokenAmount: _data.optionsData.paymentTokenAmount,
                    approvals: _data.approvals,
                    revokes: _data.revokes,
                    airdropAmount: _data.airdropAmount
                })
            )
        );

        if (!success) {
            if (balanceAfter - balanceBefore >= _data.optionsData.paymentTokenAmount) {
                IERC20(address(this)).safeTransfer(_data.optionsData.from, _data.optionsData.paymentTokenAmount);
            }
            _storeFailedMessage(_srcChainId, _srcAddress, _nonce, _payload, reason);
            emit CallFailedBytes(_srcChainId, _payload, reason);
        }

        emit ReceiveFromChain(_srcChainId, _data.optionsData.from, _data.optionsData.paymentTokenAmount);
    }

    struct ExerciseInternalCalldata {
        address from;
        uint256 oTAPTokenID;
        address paymentToken;
        uint256 tapAmount;
        address target;
        ITapiocaOptionBrokerCrossChain.IExerciseLZSendTapData tapSendData;
        uint256 paymentTokenAmount;
        ICommonData.IApproval[] approvals;
        ICommonData.IApproval[] revokes;
        uint256 airdropAmount;
    }

    function exerciseInternal(ExerciseInternalCalldata calldata _data) public {
        if (msg.sender != address(this)) revert SenderNotAuthorized();

        if (_data.approvals.length > 0) {
            _callApproval(_data.approvals, PT_TAP_EXERCISE);
        }
        {
            uint256 paymentTokenBalanceBefore = IERC20(_data.paymentToken).balanceOf(address(this));
            ITapiocaOptionBroker(_data.target).exerciseOption(_data.oTAPTokenID, _data.paymentToken, _data.tapAmount);
            uint256 paymentTokenBalanceAfter = IERC20(_data.paymentToken).balanceOf(address(this));

            if (paymentTokenBalanceBefore > paymentTokenBalanceAfter) {
                uint256 diff = paymentTokenBalanceBefore - paymentTokenBalanceAfter;
                if (diff < _data.paymentTokenAmount) {
                    uint256 toReturn = _data.paymentTokenAmount - diff;
                    IERC20(_data.paymentToken).safeTransfer(_data.from, toReturn);
                }
            }
        }

        if (_data.tapSendData.withdrawOnAnotherChain) {
            ISendFrom(_data.tapSendData.tapOftAddress).sendFrom{value: _data.airdropAmount}(
                address(this),
                _data.tapSendData.lzDstChainId,
                LzLib.addressToBytes32(_data.from),
                _data.tapAmount,
                ICommonOFT.LzCallParams({
                    refundAddress: payable(_data.from),
                    zroPaymentAddress: _data.tapSendData.zroPaymentAddress,
                    adapterParams: LzLib.buildDefaultAdapterParams(_data.tapSendData.extraGas)
                })
            );
        } else {
            IERC20(_data.tapSendData.tapOftAddress).safeTransfer(_data.from, _data.tapAmount);
        }

        if (_data.revokes.length > 0) {
            _callApproval(_data.revokes, PT_TAP_EXERCISE);
        }
    }
}
