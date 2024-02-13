// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// Tapioca
import {
    IUsdo,
    YieldBoxApproveAllMsg,
    YieldBoxApproveAssetMsg,
    MarketPermitActionMsg,
    ExerciseOptionsMsg,
    MarketRemoveAssetMsg,
    MarketLendOrRepayMsg
} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {TapiocaOmnichainEngineHelper} from
    "tapioca-periph/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {BaseUsdoTokenMsgType} from "../BaseUsdoTokenMsgType.sol";
import {UsdoMsgCodec} from "../libraries/UsdoMsgCodec.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract UsdoHelper is TapiocaOmnichainEngineHelper, BaseUsdoTokenMsgType {
    /// =======================
    /// Builder functions
    /// =======================
    /**
     * @notice Encodes the message for the PT_YB_SEND_SGL_LEND_OR_REPAY operation.
     *
     */
    function buildMarketLendOrRepayMsg(MarketLendOrRepayMsg calldata _msg) public pure returns (bytes memory) {
        return UsdoMsgCodec.buildMarketLendOrRepayMsg(_msg);
    }

    /**
     * @notice Encodes the message for the PT_MARKET_REMOVE_ASSET operation.
     *
     */
    function buildMarketRemoveAssetMsg(MarketRemoveAssetMsg calldata _msg) public pure returns (bytes memory) {
        return UsdoMsgCodec.buildMarketRemoveAssetMsg(_msg);
    }

    /**
     * @notice Encodes the message for the `TapiocaOptionsBroker` exercise operation.
     *
     */
    function buildExerciseOptionMsg(ExerciseOptionsMsg calldata _msg) public pure returns (bytes memory) {
        return UsdoMsgCodec.buildExerciseOptionsMsg(_msg);
    }

    /**
     * @notice Encode the message for the _marketPermitBorrowReceiver() & _marketPermitLendReceiver operations.
     * @param _marketPermitActionMsg The Market permit lend/borrow approval message.
     */
    function buildMarketPermitApprovalMsg(MarketPermitActionMsg memory _marketPermitActionMsg)
        public
        pure
        returns (bytes memory msg_)
    {
        msg_ = UsdoMsgCodec.buildMarketPermitApprovalMsg(_marketPermitActionMsg);
    }

    /**
     * @notice Encode the message for the _yieldBoxPermitAllReceiver() & _yieldBoxRevokeAllReceiver operations.
     * @param _yieldBoxApprovalAllMsg The YieldBox permit/revoke approval message.
     */
    function buildYieldBoxApproveAllMsg(YieldBoxApproveAllMsg memory _yieldBoxApprovalAllMsg)
        public
        pure
        returns (bytes memory msg_)
    {
        msg_ = UsdoMsgCodec.buildYieldBoxApproveAllMsg(_yieldBoxApprovalAllMsg);
    }

    /**
     * @notice Encode the message for the `PT_YB_APPROVE_ASSET` operation,
     *   _yieldBoxRevokeAssetReceiver() & _yieldBoxApproveAssetReceiver operations.
     * @param _approvalMsg The YieldBoxApproveAssetMsg messages.
     */
    function buildYieldBoxApproveAssetMsg(YieldBoxApproveAssetMsg[] memory _approvalMsg)
        public
        pure
        returns (bytes memory msg_)
    {
        uint256 approvalsLength = _approvalMsg.length;
        for (uint256 i; i < approvalsLength;) {
            msg_ = abi.encodePacked(msg_, UsdoMsgCodec.buildYieldBoxPermitAssetMsg(_approvalMsg[i]));
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Sanitizes the message type to match one of the Tapioca supported ones.
     * @param _msgType The message type, custom ones with `PT_` as a prefix.
     */
    function _sanitizeMsgTypeExtended(uint16 _msgType) internal pure override returns (bool) {
        if (
            _msgType == MSG_YB_APPROVE_ASSET || _msgType == MSG_YB_APPROVE_ALL || _msgType == MSG_MARKET_PERMIT
                || _msgType == MSG_MARKET_REMOVE_ASSET || _msgType == MSG_YB_SEND_SGL_LEND_OR_REPAY
                || _msgType == MSG_TAP_EXERCISE
        ) {
            return true;
        }
        return false;
    }
}
