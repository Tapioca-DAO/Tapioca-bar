// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// LZ
import {OFTMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTMsgCodec.sol";
import {OFTCore} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFTCore.sol";
import {Origin} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {OFT} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {
    IUsdo,
    UsdoInitStruct,
    YieldBoxApproveAllMsg,
    MarketPermitActionMsg,
    YieldBoxApproveAssetMsg
} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {TapiocaOmnichainReceiver} from "tapioca-periph/tapiocaOmnichainEngine/TapiocaOmnichainReceiver.sol";
import {UsdoMarketReceiverModule} from "./UsdoMarketReceiverModule.sol";
import {UsdoOptionReceiverModule} from "./UsdoOptionReceiverModule.sol";
import {UsdoReceiver} from "./UsdoReceiver.sol";
import {BaseUsdo} from "../BaseUsdo.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract UsdoReceiver is BaseUsdo, TapiocaOmnichainReceiver {
    using OFTMsgCodec for bytes;
    using OFTMsgCodec for bytes32;
    using SafeERC20 for IERC20;

    error InvalidApprovalTarget(address _target);

    constructor(UsdoInitStruct memory _data) BaseUsdo(_data) {}

    /**
     * @inheritdoc TapiocaOmnichainReceiver
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor, /*_executor*/ // @dev unused in the default implementation.
        bytes calldata _extraData /*_extraData*/ // @dev unused in the default implementation.
    ) internal virtual override(OFTCore, TapiocaOmnichainReceiver) {
        TapiocaOmnichainReceiver._lzReceive(_origin, _guid, _message, _executor, _extraData);
    }

    /**
     * @inheritdoc TapiocaOmnichainReceiver
     */
    function _toeComposeReceiver(uint16 _msgType, address _srcChainSender, bytes memory _toeComposeMsg)
        internal
        override
        returns (bool success)
    {
        if (_msgType == MSG_TAP_EXERCISE) {
            _executeModule(
                uint8(IUsdo.Module.UsdoOptionReceiver),
                abi.encodeWithSelector(
                    UsdoOptionReceiverModule.exerciseOptionsReceiver.selector, _srcChainSender, _toeComposeMsg
                ),
                false
            );
        } else if (_msgType == MSG_MARKET_REMOVE_ASSET) {
            _executeModule(
                uint8(IUsdo.Module.UsdoMarketReceiver),
                abi.encodeWithSelector(UsdoMarketReceiverModule.removeAssetReceiver.selector, _toeComposeMsg),
                false
            );
        } else if (_msgType == MSG_YB_SEND_SGL_LEND_OR_REPAY) {
            _executeModule(
                uint8(IUsdo.Module.UsdoMarketReceiver),
                abi.encodeWithSelector(UsdoMarketReceiverModule.lendOrRepayReceiver.selector, _toeComposeMsg),
                false
            );
        } else if (_msgType == MSG_DEPOSIT_LEND_AND_SEND_FOR_LOCK) {
            _executeModule(
                uint8(IUsdo.Module.UsdoMarketReceiver),
                abi.encodeWithSelector(
                    UsdoMarketReceiverModule.depositLendAndSendForLockingReceiver.selector, _toeComposeMsg
                ),
                false
            );
        } else {
            return false;
        }
        return true;
    }
}
