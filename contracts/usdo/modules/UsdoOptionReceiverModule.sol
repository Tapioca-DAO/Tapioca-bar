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
import {
    DepositAndSendForLockingData,
    MagnetarCall,
    MagnetarAction,
    IMagnetar,
    CrossChainMintFromBBAndLendOnSGLData
} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {
    ITapiocaOptionBroker, IExerciseOptionsData
} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {UsdoInitStruct, ExerciseOptionsMsg, LZSendParam} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {IOftSender} from "tapioca-periph/interfaces/oft/IOftSender.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";
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
        // Decode received message.
        ExerciseOptionsMsg memory msg_ = UsdoMsgCodec.decodeExerciseOptionsMsg(_data);

        _checkWhitelistStatus(msg_.optionsData.target);
        
        {
            // _data declared for visibility.
            IExerciseOptionsData memory _options = msg_.optionsData;
            _options.tapAmount = _toLD(_options.tapAmount.toUint64());
            _options.paymentTokenAmount = _toLD(_options.paymentTokenAmount.toUint64());

            // @dev retrieve paymentToken amount
            _internalTransferWithAllowance(_options.from, srcChainSender, _options.paymentTokenAmount);

            /// @dev call exerciseOption() with address(this) as the payment token
            // _approve(address(this), _options.target, _options.paymentTokenAmount);
            pearlmit.approve(
                address(this), 0, _options.target, uint200(_options.paymentTokenAmount), uint48(block.timestamp + 1)
            ); // Atomic approval
            _approve(address(this), address(pearlmit), _options.paymentTokenAmount);

            uint256 bBefore = balanceOf(address(this));
            address oTap = ITapiocaOptionBroker(_options.target).oTAP();
            address oTapOwner = IERC721(oTap).ownerOf(_options.oTAPTokenID);

            if (oTapOwner != _options.from && !IERC721(oTap).isApprovedForAll(oTapOwner,_options.from) && IERC721(oTap).getApproved(_options.oTAPTokenID) != _options.from) revert UsdoOptionReceiverModule_NotAuthorized(oTapOwner);
            ITapiocaOptionBroker(_options.target).exerciseOption(
                _options.oTAPTokenID,
                address(this), //payment token
                _options.tapAmount
            );
            _approve(address(this), address(pearlmit), 0);
            uint256 bAfter = balanceOf(address(this));

            // Refund if less was used.
            if (bBefore >= bAfter) {
                uint256 diff = bBefore - bAfter;
                if (diff < _options.paymentTokenAmount) {
                    IERC20(address(this)).safeTransfer(_options.from, _options.paymentTokenAmount - diff);
                }
            }
        }

        {
            // _data declared for visibility.
            IExerciseOptionsData memory _options = msg_.optionsData;
            SendParam memory _send = msg_.lzSendParams.sendParam;

            address tapOft = ITapiocaOptionBroker(_options.target).tapOFT();
            uint256 tapBalance = IERC20(tapOft).balanceOf(address(this));
            if (msg_.withdrawOnOtherChain) {
                /// @dev determine the right amount to send back to source
                uint256 amountToSend = _send.amountLD > tapBalance ? tapBalance : _send.amountLD;
                _send.amountLD = amountToSend;
                
                if (_send.minAmountLD > amountToSend) {
                    _send.minAmountLD = amountToSend;
                }

                msg_.lzSendParams.sendParam = _send;
                IOftSender(tapOft).sendPacket(msg_.lzSendParams, msg_.composeMsg);

                // Refund extra amounts
                if (tapBalance - amountToSend > 0) {
                    IERC20(tapOft).safeTransfer(_options.from, tapBalance - amountToSend);
                }
            } else {
                //send on this chain
                IERC20(tapOft).safeTransfer(_options.from, tapBalance);
            }
        }
    }

    function _checkWhitelistStatus(address _addr) private view {
        if (_addr != address(0)) {
            if (!getCluster().isWhitelisted(0, _addr)) {
                revert UsdoOptionReceiverModule_NotAuthorized(_addr);
            }
        }
    }


    /**
     * @dev Performs a transfer with an allowance check and consumption against the xChain msg sender.
     * @dev Can only transfer to this address.
     *
     * @param _owner The account to transfer from.
     * @param srcChainSender The address of the sender on the source chain.
     * @param _amount The amount to transfer
     */
    function _internalTransferWithAllowance(address _owner, address srcChainSender, uint256 _amount) internal {
        if (_owner != srcChainSender) {
            _spendAllowance(_owner, srcChainSender, _amount);
        }

        _transfer(_owner, address(this), _amount);
    }
}
