// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// LZ
import {
    MessagingReceipt, OFTReceipt, SendParam
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {IOAppMsgInspector} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppMsgInspector.sol";
import {OFTMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTMsgCodec.sol";

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {MagnetarCall, MagnetarAction, IMagnetar} from "tap-utils/interfaces/periph/IMagnetar.sol";
import {
    ITapiocaOptionBroker, IExerciseOptionsData
} from "tap-utils/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {UsdoInitStruct, ExerciseOptionsMsg, LZSendParam} from "tap-utils/interfaces/oft/IUsdo.sol";
import {ITapiocaOmnichainEngine} from "tap-utils/interfaces/periph/ITapiocaOmnichainEngine.sol";
import {SafeApprove} from "tap-utils/libraries/SafeApprove.sol";
import {UsdoMsgCodec} from "../libraries/UsdoMsgCodec.sol";
import {BaseUsdo} from "../BaseUsdo.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/**
 * @title UsdoOptionReceiverModule
 * @author TapiocaDAO
 * @notice Usdo Option module
 */
contract UsdoOptionReceiverModule is BaseUsdo {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;
    using SafeApprove for address;

    error UsdoOptionReceiverModule_NotAuthorized(address invalidAddress);

    event ExerciseOptionsReceived(
        address indexed user, address indexed target, uint256 indexed oTapTokenId, uint256 paymentTokenAmount
    );

    constructor(UsdoInitStruct memory _data) BaseUsdo(_data) {}

    /**
     * @notice Exercise tOB option
     * @param _data The call data containing info about the operation.
     *      - optionsData::address: TapiocaOptionsBroker exercise params.
     *      - lzSendParams::struct: LZ v2 send to source params.
     *      - composeMsg::bytes: Further compose data.
     */
    function exerciseOptionsReceiver(address srcChainSender, bytes memory _data) public payable {
        ExerciseOptionsMsg memory msg_ = UsdoMsgCodec.decodeExerciseOptionsMsg(_data);

        /**
         * @dev validate data
         */
        msg_ = _validateExerciseOptionReceiver(msg_);

        /**
         * @dev Validate caller
         */
        _validateExerciseOptionCaller(msg_.optionsData, srcChainSender);

        /**
         * @dev retrieve paymentToken amount
         */
        _internalTransferWithAllowance(msg_.optionsData.from, srcChainSender, msg_.optionsData.paymentTokenAmount);

        /**
         * @dev call exerciseOption() with address(this) as the payment token
         */
        // _approve(address(this), _options.target, _options.paymentTokenAmount);
        pearlmit.approve(
            20,
            address(this),
            0,
            msg_.optionsData.target,
            uint200(msg_.optionsData.paymentTokenAmount),
            block.timestamp.toUint48()
        ); // Atomic approval
        _approve(address(this), address(pearlmit), msg_.optionsData.paymentTokenAmount);

        /**
         * @dev exercise and refund if less paymentToken amount was used
         */
        _exerciseAndRefund(msg_.optionsData);
        _approve(address(this), address(pearlmit), 0);

        /**
         * @dev retrieve exercised amount
         */
        _withdrawExercised(msg_);

        emit ExerciseOptionsReceived(
            msg_.optionsData.from,
            msg_.optionsData.target,
            msg_.optionsData.oTAPTokenID,
            msg_.optionsData.paymentTokenAmount
        );
    }

    function _checkWhitelistStatus(address _addr) private view {
        if (_addr != address(0)) {
            if (!getCluster().isWhitelisted(0, _addr)) {
                revert UsdoOptionReceiverModule_NotAuthorized(_addr);
            }
        }
    }

    /**
     *   @notice checks that the caller is allowed by the owner of the token
     */
    function _validateExerciseOptionCaller(IExerciseOptionsData memory _options, address _srcChainSender) internal {
        address oTap = ITapiocaOptionBroker(_options.target).oTAP();
        address oTapOwner = IERC721(oTap).ownerOf(_options.oTAPTokenID);
        if (oTapOwner != _srcChainSender || oTapOwner != _options.from) {
            revert UsdoOptionReceiverModule_NotAuthorized(_options.from);
        }

        bool isAllowed = isERC721Approved(oTapOwner, address(this), oTap, _options.oTAPTokenID);
        if (!isAllowed) revert UsdoOptionReceiverModule_NotAuthorized(oTapOwner);
        /// @dev Clear the allowance once it's used
        /// usage being the allowance check
        pearlmit.clearAllowance(oTapOwner, 721, oTap, _options.oTAPTokenID);
    }

    function _validateExerciseOptionReceiver(ExerciseOptionsMsg memory msg_)
        private
        view
        returns (ExerciseOptionsMsg memory)
    {
        _checkWhitelistStatus(msg_.optionsData.target);

        if (msg_.optionsData.tapAmount > 0) {
            msg_.optionsData.tapAmount = _toLD(msg_.optionsData.tapAmount.toUint64());
        }

        if (msg_.optionsData.paymentTokenAmount > 0) {
            msg_.optionsData.paymentTokenAmount = _toLD(msg_.optionsData.paymentTokenAmount.toUint64());
        }

        return msg_;
    }

    function _exerciseAndRefund(IExerciseOptionsData memory _options) private {
        uint256 bBefore = balanceOf(address(this));

        ITapiocaOptionBroker(_options.target).exerciseOption(
            _options.oTAPTokenID,
            address(this), //payment token
            _options.tapAmount
        );

        // Clear Pearlmit ERC721 allowance post execution
        {
            address oTap = ITapiocaOptionBroker(_options.target).oTAP();
            address oTapOwner = IERC721(oTap).ownerOf(_options.oTAPTokenID);
            pearlmit.clearAllowance(oTapOwner, 721, oTap, _options.oTAPTokenID);
        }

        uint256 bAfter = balanceOf(address(this));

        // Refund if less was used.
        if (bBefore >= bAfter) {
            uint256 diff = bBefore - bAfter;
            if (diff < _options.paymentTokenAmount) {
                IERC20(address(this)).safeTransfer(_options.from, _options.paymentTokenAmount - diff);
            }
        }
    }

    function _withdrawExercised(ExerciseOptionsMsg memory msg_) private {
        SendParam memory _send = msg_.lzSendParams.sendParam;

        address tapOft = ITapiocaOptionBroker(msg_.optionsData.target).tapOFT();
        uint256 tapBalance = IERC20(tapOft).balanceOf(address(this));
        if (msg_.withdrawOnOtherChain) {
            /// @dev determine the right amount to send back to source
            uint256 amountToSend = _send.amountLD > tapBalance ? tapBalance : _send.amountLD;
            _send.amountLD = amountToSend;

            if (_send.minAmountLD > amountToSend) {
                _send.minAmountLD = amountToSend;
            }

            msg_.lzSendParams.sendParam = _send;
            ITapiocaOmnichainEngine(tapOft).sendPacketFrom{value: msg.value}(
                msg_.optionsData.from, msg_.lzSendParams, ""
            );

            // Refund extra amounts
            if (tapBalance - amountToSend > 0) {
                IERC20(tapOft).safeTransfer(msg_.optionsData.from, tapBalance - amountToSend);
            }
        } else {
            //send on this chain
            IERC20(tapOft).safeTransfer(msg_.optionsData.from, tapBalance);
        }
    }
}
