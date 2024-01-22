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

        (,, uint256 airdropAmount,) = LzLib.decodeAdapterParams(adapterParams);
        bytes memory lzPayload =
            abi.encode(PT_MARKET_REMOVE_ASSET, to, externalData, removeAndRepayData, approvals, revokes, airdropAmount);

        _checkAdapterParams(lzDstChainId, PT_MARKET_REMOVE_ASSET, adapterParams, NO_EXTRA_GAS);

        _lzSend(lzDstChainId, lzPayload, payable(from), zroPaymentAddress, adapterParams, msg.value);

        emit SendToChain(lzDstChainId, from, LzLib.addressToBytes32(to), 0);
    }

    /// @notice sends USDO to be lent or for repayment on destination
    /// @param _from address to send from
    /// @param _to address to repay/lend for
    /// @param lzDstChainId LayerZero destination chain id
    /// @param zroPaymentAddress LayerZero ZRO payment address
    /// @param lendParams market's lending parameters
    /// @param approvals approval array to be executed on destination
    /// @param revokes revokes array to be executed on destination
    /// @param withdrawParams withdraw token parameters
    /// @param adapterParams LayerZero adapter parameters
    function sendAndLendOrRepay(
        address _from,
        address _to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        IUSDOBase.ILendOrRepayParams memory lendParams,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes,
        ICommonData.IWithdrawParams calldata withdrawParams,
        bytes calldata adapterParams
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(_to);
        (lendParams.depositAmount,) = _removeDust(lendParams.depositAmount);
        lendParams.depositAmount = _debitFrom(_from, lzEndpoint.getChainId(), toAddress, lendParams.depositAmount);
        if (lendParams.depositAmount == 0) revert NotValid();

        (,, uint256 airdropAmount,) = LzLib.decodeAdapterParams(adapterParams);
        bytes memory lzPayload = abi.encode(
            PT_YB_SEND_SGL_LEND_OR_REPAY,
            _to,
            _ld2sd(lendParams.depositAmount),
            lendParams,
            approvals,
            revokes,
            withdrawParams,
            airdropAmount
        );

        _checkAdapterParams(lzDstChainId, PT_YB_SEND_SGL_LEND_OR_REPAY, adapterParams, NO_EXTRA_GAS);

        _lzSend(lzDstChainId, lzPayload, payable(_from), zroPaymentAddress, adapterParams, msg.value);

        emit SendToChain(lzDstChainId, _from, toAddress, lendParams.depositAmount);
    }
}
