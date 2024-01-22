// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {ICommonOFT} from "tapioca-periph/layerzero/v1/token/oft/v2/ICommonOFT.sol";
import {ICommonData} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {ISendFrom} from "tapioca-periph/interfaces/common/ISendFrom.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {BaseUSDOStorage} from "../BaseUSDOStorage.sol";
import {LzLib} from "contracts/tmp/LzLib.sol";
import {USDOCommon} from "./USDOCommon.sol";

contract USDOGenericModule is USDOCommon {
    using SafeERC20 for IERC20;

    constructor(address _lzEndpoint, IYieldBox _yieldBox, ICluster _cluster)
        BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster)
    {}

    /// @notice executes an approval list or a revoke approval list on destination
    /// @param lzDstChainId LayerZero chain id
    /// @param lzCallParams  LayerZero cross chain call parameters
    /// @param approvals list of approvals or revokes
    function triggerApproveOrRevoke(
        uint16 lzDstChainId,
        ICommonOFT.LzCallParams calldata lzCallParams,
        ICommonData.IApproval[] calldata approvals
    ) external payable {
        bytes memory lzPayload = abi.encode(PT_APPROVE, msg.sender, approvals);

        _checkAdapterParams(lzDstChainId, PT_APPROVE, lzCallParams.adapterParams, NO_EXTRA_GAS);

        _lzSend(
            lzDstChainId,
            lzPayload,
            lzCallParams.refundAddress,
            lzCallParams.zroPaymentAddress,
            lzCallParams.adapterParams,
            msg.value
        );

        emit SendToChain(lzDstChainId, msg.sender, LzLib.addressToBytes32(msg.sender), 0);
    }

    /// @notice executes approval on destination
    /// @param lzSrcChainId LayerZero source chain id
    /// @param _payload received payload
    function executeApproval(address, uint16 lzSrcChainId, bytes memory, uint64, bytes memory _payload) public {
        if (msg.sender != address(this)) revert SenderNotAuthorized();
        (, address from, ICommonData.IApproval[] memory approvals) =
            abi.decode(_payload, (uint16, address, ICommonData.IApproval[]));

        if (approvals.length > 0) {
            _callApproval(approvals, PT_APPROVE);
        }

        emit ReceiveFromChain(lzSrcChainId, from, 0);
    }

    /// @notice executes a sendFrom on destination back to the current chain
    /// @param lzDstChainId LayerZero chain id
    /// @param airdropAdapterParams call adapter parameters
    /// @param amount amount to send back
    /// @param sendFromData LayerZero sendFrom data
    /// @param approvals approvals that should be executed on destination
    /// @param revokes revokes that should be executed on destination
    function triggerSendFrom(
        uint16 lzDstChainId,
        bytes calldata airdropAdapterParams,
        uint256 amount,
        ICommonOFT.LzCallParams calldata sendFromData,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes
    ) external payable {
        (,, uint256 airdropAmount,) = LzLib.decodeAdapterParams(airdropAdapterParams);

        (amount,) = _removeDust(amount);
        bytes memory lzPayload = abi.encode(
            PT_TRIGGER_SEND_FROM,
            msg.sender,
            _ld2sd(amount),
            sendFromData,
            lzEndpoint.getChainId(),
            approvals,
            revokes,
            airdropAmount
        );

        _checkAdapterParams(lzDstChainId, PT_TRIGGER_SEND_FROM, airdropAdapterParams, NO_EXTRA_GAS);

        _lzSend(
            lzDstChainId,
            lzPayload,
            sendFromData.refundAddress,
            sendFromData.zroPaymentAddress,
            airdropAdapterParams,
            msg.value
        );

        emit SendToChain(lzDstChainId, msg.sender, LzLib.addressToBytes32(msg.sender), 0);
    }

    /// @notice destination call for USDOGenericModule.triggerSendFrom
    /// @param _payload received payload
    function sendFromDestination(address, uint16, bytes memory, uint64, bytes memory _payload) public {
        if (msg.sender != address(this)) revert SenderNotAuthorized();
        (
            ,
            address from,
            uint64 amount,
            ICommonOFT.LzCallParams memory callParams,
            uint16 lzDstChainId,
            ICommonData.IApproval[] memory approvals,
            ICommonData.IApproval[] memory revokes,
            uint256 airdropAmount
        ) = abi.decode(
            _payload,
            (
                uint16,
                address,
                uint64,
                ICommonOFT.LzCallParams,
                uint16,
                ICommonData.IApproval[],
                ICommonData.IApproval[],
                uint256
            )
        );

        if (approvals.length > 0) {
            _callApproval(approvals, PT_TRIGGER_SEND_FROM);
        }

        ISendFrom(address(this)).sendFrom{value: airdropAmount}(
            from, lzDstChainId, LzLib.addressToBytes32(from), _sd2ld(amount), callParams
        );

        if (revokes.length > 0) {
            _callApproval(revokes, PT_TRIGGER_SEND_FROM);
        }

        emit ReceiveFromChain(lzDstChainId, from, 0);
    }
}
