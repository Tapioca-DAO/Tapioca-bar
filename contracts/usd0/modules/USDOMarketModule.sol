// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {ICommonData} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IUSDOBase} from "tapioca-periph/interfaces/bar/IUSDO.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {BaseUSDOStorage} from "../BaseUSDOStorage.sol";
import {LzLib} from "contracts/tmp/LzLib.sol";
import {USDOCommon} from "./USDOCommon.sol";

contract USDOMarketModule is USDOCommon {
    using SafeERC20 for IERC20;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error AllowanceNotValid();

    constructor(address _lzEndpoint, IYieldBox _yieldBox, ICluster _cluster)
        BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster)
    {}

    struct RemoveAssetData {
        uint16 packetType;
        address to;
        ICommonData.ICommonExternalContracts externalData;
        IUSDOBase.IRemoveAndRepay removeAndRepayData;
        ICommonData.IApproval[] approvals;
        ICommonData.IApproval[] revokes;
        uint256 airdropAmount;
    }

    /// @notice initiates an asset removal on a market from another layer
    /// @param from the address to substract from
    /// @param to the receiver
    /// @param lzDstChainId LayerZero destination chain id
    /// @param zroPaymentAddress ZRO payment address
    /// @param adapterParams LZ call adapter parameters
    /// @param externalData ICommonExternalContracts data
    /// @param removeAndRepayData IRemoveAndRepay data
    /// @param approvals approvals array that should be executed on destination
    /// @param revokes revokes array that should be executed on destination
    function removeAsset(
        address from,
        address to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        bytes calldata adapterParams,
        ICommonData.ICommonExternalContracts calldata externalData,
        IUSDOBase.IRemoveAndRepay calldata removeAndRepayData,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes
    ) external payable {
        //allowance is also checked on SGl
        if (from != msg.sender) {
            if (removeAndRepayData.removeAssetFromSGL) {
                if (allowance(from, msg.sender) < removeAndRepayData.removeAmount) revert AllowanceNotValid();

                _spendAllowance(from, msg.sender, removeAndRepayData.removeAmount);
            }

            if (removeAndRepayData.removeCollateralFromBB) {
                if (allowance(from, msg.sender) < removeAndRepayData.collateralAmount) revert AllowanceNotValid();

                _spendAllowance(from, msg.sender, removeAndRepayData.collateralAmount);
            }
        }

        RemoveAssetData memory payload;
        {
            (,, uint256 airdropAmount,) = LzLib.decodeAdapterParams(adapterParams);
            payload = RemoveAssetData({
                packetType: PT_MARKET_REMOVE_ASSET,
                to: to,
                externalData: externalData,
                removeAndRepayData: removeAndRepayData,
                approvals: approvals,
                revokes: revokes,
                airdropAmount: airdropAmount
            });
        }

        _checkAdapterParams(lzDstChainId, PT_MARKET_REMOVE_ASSET, adapterParams, NO_EXTRA_GAS);

        _lzSend(lzDstChainId, abi.encode(payload), payable(from), zroPaymentAddress, adapterParams, msg.value);

        emit SendToChain(lzDstChainId, from, LzLib.addressToBytes32(to), 0);
    }

    struct LendOrRepayData {
        uint16 packetType;
        address to;
        uint64 lendAmountSD;
        IUSDOBase.ILendOrRepayParams lendParams;
        ICommonData.IApproval[] approvals;
        ICommonData.IApproval[] revokes;
        ICommonData.IWithdrawParams withdrawParams;
        uint256 airdropAmount;
    }

    /// @dev Usage only for sendAndLendOrRepay. ITS JUST A QUICKFIX
    /// @param _from address to send from
    /// @param _to address to repay/lend for
    /// @param lzDstChainId LayerZero destination chain id
    /// @param zroPaymentAddress LayerZero ZRO payment address
    /// @param lendParams market's lending parameters
    /// @param approvals approval array to be executed on destination
    /// @param revokes revokes array to be executed on destination
    /// @param withdrawParams withdraw token parameters
    /// @param adapterParams LayerZero adapter parameters
    struct _SendAndLendOrRepayCalldata {
        address _from;
        address _to;
        uint16 lzDstChainId;
        address zroPaymentAddress;
        IUSDOBase.ILendOrRepayParams lendParams;
        ICommonData.IApproval[] approvals;
        ICommonData.IApproval[] revokes;
        ICommonData.IWithdrawParams withdrawParams;
        bytes adapterParams;
    }

    /// @notice sends USDO to be lent or for repayment on destination
    function sendAndLendOrRepay(
        address,
        address,
        uint16,
        address,
        IUSDOBase.ILendOrRepayParams memory,
        ICommonData.IApproval[] calldata,
        ICommonData.IApproval[] calldata,
        ICommonData.IWithdrawParams calldata,
        bytes calldata
    ) external payable {
        // Quickfix to Load calldata directly in memory to avoid stack too deep error
        _SendAndLendOrRepayCalldata memory _callData = abi.decode(msg.data[4:], (_SendAndLendOrRepayCalldata));

        bytes32 toAddress = LzLib.addressToBytes32(_callData._to);
        (_callData.lendParams.depositAmount,) = _removeDust(_callData.lendParams.depositAmount);
        _callData.lendParams.depositAmount =
            _debitFrom(_callData._from, lzEndpoint.getChainId(), toAddress, _callData.lendParams.depositAmount);

        bytes memory lzPayload;
        {
            (,, uint256 airdropAmount,) = LzLib.decodeAdapterParams(_callData.adapterParams);
            lzPayload = abi.encode(
                LendOrRepayData({
                    packetType: PT_YB_SEND_SGL_LEND_OR_REPAY,
                    to: _callData._to,
                    lendAmountSD: _ld2sd(_callData.lendParams.depositAmount),
                    lendParams: _callData.lendParams,
                    approvals: _callData.approvals,
                    revokes: _callData.revokes,
                    withdrawParams: _callData.withdrawParams,
                    airdropAmount: airdropAmount
                })
            );
            _checkAdapterParams(
                _callData.lzDstChainId, PT_YB_SEND_SGL_LEND_OR_REPAY, _callData.adapterParams, NO_EXTRA_GAS
            );
        }

        _lzSend(
            _callData.lzDstChainId,
            lzPayload,
            payable(_callData._from),
            _callData.zroPaymentAddress,
            _callData.adapterParams,
            msg.value
        );

        emit SendToChain(_callData.lzDstChainId, _callData._from, toAddress, _callData.lendParams.depositAmount);
    }
}
