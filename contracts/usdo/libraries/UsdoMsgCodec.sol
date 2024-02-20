// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.22;

// LZ
import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";

// Tapioca
import {
    IUsdo,
    YieldBoxApproveAllMsg,
    MarketPermitActionMsg,
    YieldBoxApproveAssetMsg,
    ExerciseOptionsMsg,
    MarketRemoveAssetMsg,
    MarketLendOrRepayMsg
} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {
    DepositAndSendForLockingData,
    CrossChainMintFromBBAndLendOnSGLData
} from "tapioca-periph/interfaces/periph/IMagnetar.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

library UsdoMsgCodec {
    // ***************************************
    // * Encoding & Decoding Usdo messages *
    // ***************************************

    /**
     * @notice Decodes an encoded message for the `TOFTReceiver.erc20PermitApprovalReceiver()` operation.
     *
     *                    *   message packet   *
     * ------------------------------------------------------------- *
     * Name          | type      | start | end                       *
     * ------------------------------------------------------------- *
     * token         | address   | 0     | 20                        *
     * ------------------------------------------------------------- *
     * owner         | address   | 20    | 40                        *
     * ------------------------------------------------------------- *
     * spender       | address   | 40    | 60                        *
     * ------------------------------------------------------------- *
     * value         | uint256   | 60    | 92                        *
     * ------------------------------------------------------------- *
     * deadline      | uint256   | 92    | 124                       *
     * ------------------------------------------------------------- *
     * v             | uint8     | 124   | 125                       *
     * ------------------------------------------------------------- *
     * r             | bytes32   | 125   | 157                       *
     * ------------------------------------------------------------- *
     * s             | bytes32   | 157   | 189                       *
     * ------------------------------------------------------------- *
     *
     * @param _msg The encoded message. see `TOFTMsgCoder.buildERC20PermitApprovalMsg()`
     */
    struct __offsets {
        uint8 tokenOffset;
        uint8 ownerOffset;
        uint8 spenderOffset;
        uint8 valueOffset;
        uint8 deadlineOffset;
        uint8 vOffset;
        uint8 rOffset;
        uint8 sOffset;
    }

    /**
     * @notice Encodes the message for the `PT_YB_APPROVE_ASSET` operation.
     */
    function buildYieldBoxPermitAssetMsg(YieldBoxApproveAssetMsg memory _approvalMsg)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(
            _approvalMsg.target,
            _approvalMsg.owner,
            _approvalMsg.spender,
            _approvalMsg.assetId,
            _approvalMsg.deadline,
            _approvalMsg.v,
            _approvalMsg.r,
            _approvalMsg.s,
            _approvalMsg.permit
        );
    }

    function decodeYieldBoxApprovalAssetMsg(bytes memory _msg)
        internal
        pure
        returns (YieldBoxApproveAssetMsg memory approvalMsg_)
    {
        __offsets memory offsets_ = __offsets({
            tokenOffset: 20,
            ownerOffset: 40,
            spenderOffset: 60,
            valueOffset: 92,
            deadlineOffset: 124,
            vOffset: 125,
            rOffset: 157,
            sOffset: 189
        });

        // Decoded data
        address target = BytesLib.toAddress(BytesLib.slice(_msg, 0, offsets_.tokenOffset), 0);
        address owner = BytesLib.toAddress(BytesLib.slice(_msg, offsets_.tokenOffset, 20), 0);
        address spender = BytesLib.toAddress(BytesLib.slice(_msg, offsets_.ownerOffset, 20), 0);
        uint256 value = BytesLib.toUint256(BytesLib.slice(_msg, offsets_.spenderOffset, 32), 0);
        uint256 deadline = BytesLib.toUint256(BytesLib.slice(_msg, offsets_.valueOffset, 32), 0);
        uint8 v = uint8(BytesLib.toUint8(BytesLib.slice(_msg, offsets_.deadlineOffset, 1), 0));
        bytes32 r = BytesLib.toBytes32(BytesLib.slice(_msg, offsets_.vOffset, 32), 0);
        bytes32 s = BytesLib.toBytes32(BytesLib.slice(_msg, offsets_.rOffset, 32), 0);
        bool permit = _msg[offsets_.sOffset] != 0;

        // Return structured data
        approvalMsg_ = YieldBoxApproveAssetMsg(target, owner, spender, value, deadline, v, r, s, permit);
    }

    /**
     * @dev Decode an array of encoded messages for the `TOFTReceiver.erc20PermitApprovalReceiver()` operation.
     * @dev The message length must be a multiple of 189.
     *
     * @param _msg The encoded message. see `TOFTReceiver.buildERC20PermitApprovalMsg()`
     */
    function decodeArrayOfYieldBoxPermitAssetMsg(bytes memory _msg)
        internal
        pure
        returns (YieldBoxApproveAssetMsg[] memory)
    {
        /// @dev see `this.decodeERC20PermitApprovalMsg()`, token + owner + spender + value + deadline + v + r + s length = 189.
        uint256 msgCount_ = _msg.length / 190;

        YieldBoxApproveAssetMsg[] memory approvalMsgs_ = new YieldBoxApproveAssetMsg[](msgCount_);

        uint256 msgIndex_;
        for (uint256 i; i < msgCount_;) {
            approvalMsgs_[i] = decodeYieldBoxApprovalAssetMsg(BytesLib.slice(_msg, msgIndex_, 190));
            unchecked {
                msgIndex_ += 190;
                ++i;
            }
        }

        return approvalMsgs_;
    }

    /**
     * @notice Encodes the message for the `TOFTReceiver._yieldBoxRevokeAllReceiver()` operation.
     */
    function buildYieldBoxApproveAllMsg(YieldBoxApproveAllMsg memory _yieldBoxApprovalAllMsg)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(
            _yieldBoxApprovalAllMsg.target,
            _yieldBoxApprovalAllMsg.owner,
            _yieldBoxApprovalAllMsg.spender,
            _yieldBoxApprovalAllMsg.deadline,
            _yieldBoxApprovalAllMsg.v,
            _yieldBoxApprovalAllMsg.r,
            _yieldBoxApprovalAllMsg.s,
            _yieldBoxApprovalAllMsg.permit
        );
    }

    /**
     * @notice Encodes the message for the `TOFTReceiver._yieldBoxMarketPermitActionReceiver()` operation.
     */
    function buildMarketPermitApprovalMsg(MarketPermitActionMsg memory _marketApprovalMsg)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(
            _marketApprovalMsg.target,
            _marketApprovalMsg.owner,
            _marketApprovalMsg.spender,
            _marketApprovalMsg.value,
            _marketApprovalMsg.deadline,
            _marketApprovalMsg.v,
            _marketApprovalMsg.r,
            _marketApprovalMsg.s,
            _marketApprovalMsg.permitAsset
        );
    }

    struct __marketOffsets {
        uint8 targetOffset;
        uint8 ownerOffset;
        uint8 spenderOffset;
        uint8 valueOffset;
        uint8 deadlineOffset;
        uint8 vOffset;
        uint8 rOffset;
        uint8 sOffset;
    }

    /**
     * @notice Decodes an encoded message for the `TOFTReceiver.marketPermitActionReceiver()` operation.
     *
     *                    *   message packet   *
     * ------------------------------------------------------------- *
     * Name          | type      | start | end                       *
     * ------------------------------------------------------------- *
     * target        | address   | 0     | 20                        *
     * ------------------------------------------------------------- *
     * owner         | address   | 20    | 40                        *
     * ------------------------------------------------------------- *
     * spender       | address   | 40    | 60                        *
     * ------------------------------------------------------------- *
     * value         | address   | 60    | 92                        *
     * ------------------------------------------------------------- *
     * deadline      | uint256   | 92   | 124                        *
     * ------------------------------------------------------------- *
     * v             | uint8     | 124  | 125                        *
     * ------------------------------------------------------------- *
     * r             | bytes32   | 125  | 157                        *
     * ------------------------------------------------------------- *
     * s             | bytes32   | 157  | 189                        *
     * ------------------------------------------------------------- *
     * ------------------------------------------------------------- *
     * permitLend    | bool      | 189  | 190                        *
     * ------------------------------------------------------------- *
     *
     * @param _msg The encoded message. see `TOFTMsgCoder.buildMarketPermitApprovalMsg()`
     */
    function decodeMarketPermitApprovalMsg(bytes memory _msg)
        internal
        pure
        returns (MarketPermitActionMsg memory marketPermitActionMsg_)
    {
        __marketOffsets memory offsets_ = __marketOffsets({
            targetOffset: 20,
            ownerOffset: 40,
            spenderOffset: 60,
            valueOffset: 92,
            deadlineOffset: 124,
            vOffset: 125,
            rOffset: 157,
            sOffset: 189
        });

        // Decoded data
        address target = BytesLib.toAddress(BytesLib.slice(_msg, 0, offsets_.targetOffset), 0);

        address owner = BytesLib.toAddress(BytesLib.slice(_msg, offsets_.targetOffset, 20), 0);

        address spender = BytesLib.toAddress(BytesLib.slice(_msg, offsets_.ownerOffset, 20), 0);

        uint256 value = BytesLib.toUint256(BytesLib.slice(_msg, offsets_.spenderOffset, 32), 0);

        uint256 deadline = BytesLib.toUint256(BytesLib.slice(_msg, offsets_.valueOffset, 32), 0);

        uint8 v = uint8(BytesLib.toUint8(BytesLib.slice(_msg, offsets_.deadlineOffset, 1), 0));

        bytes32 r = BytesLib.toBytes32(BytesLib.slice(_msg, offsets_.vOffset, 32), 0);

        bytes32 s = BytesLib.toBytes32(BytesLib.slice(_msg, offsets_.rOffset, 32), 0);

        bool permitLend = _msg[offsets_.sOffset] != 0;

        // Return structured data
        marketPermitActionMsg_ = MarketPermitActionMsg(target, owner, spender, value, deadline, v, r, s, permitLend);
    }

    struct __ybOffsets {
        uint8 targetOffset;
        uint8 ownerOffset;
        uint8 spenderOffset;
        uint8 deadlineOffset;
        uint8 vOffset;
        uint8 rOffset;
        uint8 sOffset;
    }

    /**
     * @notice Decodes an encoded message for the `TOFTReceiver.ybPermitAll()` operation.
     *
     *                    *   message packet   *
     * ------------------------------------------------------------- *
     * Name          | type      | start | end                       *
     * ------------------------------------------------------------- *
     * target        | address   | 0     | 20                        *
     * ------------------------------------------------------------- *
     * owner         | address   | 20    | 40                        *
     * ------------------------------------------------------------- *
     * spender       | address   | 40    | 60                        *
     * ------------------------------------------------------------- *
     * deadline      | uint256   | 60   | 92                         *
     * ------------------------------------------------------------- *
     * v             | uint8     | 92   | 93                         *
     * ------------------------------------------------------------- *
     * r             | bytes32   | 93   | 125                        *
     * ------------------------------------------------------------- *
     * s             | bytes32   | 125   | 157                       *
     * ------------------------------------------------------------- *
     * permit        | bool      | 157   | 158                       *
     * ------------------------------------------------------------- *
     *
     * @param _msg The encoded message. see `TOFTMsgCoder.buildYieldBoxPermitAll()`
     */
    function decodeYieldBoxApproveAllMsg(bytes memory _msg)
        internal
        pure
        returns (YieldBoxApproveAllMsg memory ybPermitAllMsg_)
    {
        __ybOffsets memory offsets_ = __ybOffsets({
            targetOffset: 20,
            ownerOffset: 40,
            spenderOffset: 60,
            deadlineOffset: 92,
            vOffset: 93,
            rOffset: 125,
            sOffset: 157
        });

        // Decoded data
        address target = BytesLib.toAddress(BytesLib.slice(_msg, 0, offsets_.targetOffset), 0);
        address owner = BytesLib.toAddress(BytesLib.slice(_msg, offsets_.targetOffset, 20), 0);
        address spender = BytesLib.toAddress(BytesLib.slice(_msg, offsets_.ownerOffset, 20), 0);
        uint256 deadline = BytesLib.toUint256(BytesLib.slice(_msg, offsets_.spenderOffset, 32), 0);
        uint8 v = uint8(BytesLib.toUint8(BytesLib.slice(_msg, offsets_.deadlineOffset, 1), 0));
        bytes32 r = BytesLib.toBytes32(BytesLib.slice(_msg, offsets_.vOffset, 32), 0);
        bytes32 s = BytesLib.toBytes32(BytesLib.slice(_msg, offsets_.rOffset, 32), 0);

        bool permit = _msg[offsets_.sOffset] != 0;

        // Return structured data
        ybPermitAllMsg_ = YieldBoxApproveAllMsg(target, owner, spender, deadline, v, r, s, permit);
    }

    /**
     * @notice Encodes the message for the `UsdoOptionReceiverModule.exerciseOptionsReceiver()` operation.
     */
    function buildExerciseOptionsMsg(ExerciseOptionsMsg memory _marketMsg) internal pure returns (bytes memory) {
        return abi.encode(_marketMsg);
    }

    /**
     * @notice Decodes an encoded message for the `UsdoOptionReceiverModule.exerciseOptionsReceiver()` operation.
     */
    function decodeExerciseOptionsMsg(bytes memory _msg) internal pure returns (ExerciseOptionsMsg memory marketMsg_) {
        return abi.decode(_msg, (ExerciseOptionsMsg));
    }

    /**
     * @notice Encodes the message for the `UsdoMarketReceiverModule.removeAssetReceiver()` operation.
     */
    function buildMarketRemoveAssetMsg(MarketRemoveAssetMsg memory _marketMsg) internal pure returns (bytes memory) {
        return abi.encode(_marketMsg);
    }

    /**
     * @notice Decodes an encoded message for the `UsdoMarketReceiverModule.removeAssetReceiver()` operation.
     */
    function decodeMarketRemoveAssetMsg(bytes memory _msg)
        internal
        pure
        returns (MarketRemoveAssetMsg memory marketMsg_)
    {
        return abi.decode(_msg, (MarketRemoveAssetMsg));
    }

    /**
     * @notice Encodes the message for the `UsdoMarketReceiverModule.lendOrRepayReceiver()` operation.
     */
    function buildMarketLendOrRepayMsg(MarketLendOrRepayMsg memory _marketMsg) internal pure returns (bytes memory) {
        return abi.encode(_marketMsg);
    }

    /**
     * @notice Decodes an encoded message for the `UsdoMarketReceiverModule.lendOrRepayReceiver()` operation.
     */
    function decodeMarketLendOrRepayMsg(bytes memory _msg)
        internal
        pure
        returns (MarketLendOrRepayMsg memory marketMsg_)
    {
        return abi.decode(_msg, (MarketLendOrRepayMsg));
    }

    /**
     * @notice Encodes the message for the `UsdoOptionReceiverModule.depositLendAndSendForLockingReceiver()` operation.
     */
    function buildDepositLendAndSendForLockingMsg(DepositAndSendForLockingData memory _msg)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(_msg);
    }

    /**
     * @notice Decodes an encoded message for the `UsdoOptionReceiverModule.depositLendAndSendForLockingReceiver()` operation.
     */
    function decodeDepositLendAndSendForLockingMsg(bytes memory _msg)
        internal
        pure
        returns (DepositAndSendForLockingData memory marketMsg_)
    {
        return abi.decode(_msg, (DepositAndSendForLockingData));
    }
}
