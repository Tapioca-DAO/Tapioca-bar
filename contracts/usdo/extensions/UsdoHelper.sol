// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

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
     * @dev Sanitizes the message type to match one of the Tapioca supported ones.
     * @param _msgType The message type, custom ones with `PT_` as a prefix.
     */
    function _sanitizeMsgTypeExtended(uint16 _msgType) internal pure override returns (bool) {
        if (
            _msgType == MSG_MARKET_REMOVE_ASSET || _msgType == MSG_YB_SEND_SGL_LEND_OR_REPAY
                || _msgType == MSG_TAP_EXERCISE
        ) {
            return true;
        }
        return false;
    }
}
