// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// LZ
import {OFTMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTMsgCodec.sol";
import {MessagingFee} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {
    PrepareLzCallData,
    PrepareLzCallReturn,
    ComposeMsgData,
    MessagingReceipt
} from "tapioca-periph/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {ITapiocaOmnichainEngine, LZSendParam} from "tapioca-periph/interfaces/periph/ITapiocaOmnichainEngine.sol";
import {IOftSender} from "tapioca-periph/interfaces/oft/IOftSender.sol";
import {UsdoMsgCodec} from "../libraries/UsdoMsgCodec.sol";
import {UsdoHelper} from "../extensions/UsdoHelper.sol";

/*
__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__

*/

abstract contract UsdoModuleReceiverHelper {
    using SafeCast for uint256;

    function _prepareLzCall(
        uint32 _dstEid,
        address _oft,
        address _usdoHelper,
        uint256 amount,
        uint16 msgType,
        ComposeMsgData memory composeData,
        uint128 lzReceiveGas,
        uint128 lzReceiveValue
    ) internal view returns (PrepareLzCallReturn memory prepareLzCallReturn) {
        prepareLzCallReturn = UsdoHelper(_usdoHelper).prepareLzCall(
            ITapiocaOmnichainEngine(_oft),
            PrepareLzCallData({
                dstEid: _dstEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: amount,
                minAmountToCreditLD: amount,
                msgType: msgType,
                composeMsgData: composeData,
                lzReceiveGas: lzReceiveGas,
                lzReceiveValue: lzReceiveValue
            })
        );
    }

    function _sendComposed(
        uint32 _dstEid,
        address _oft,
        address _usdoHelper,
        uint256 amount,
        uint16 _composeMsgType,
        bytes memory _composeMsg, 
        uint128 _composeGas
    ) internal returns (MessagingReceipt memory msgReceipt_) {
        uint16 _sendType = 1;

        LZSendParam memory sendParam_;
        MessagingFee memory sendParamFee_; // Will be used as value for the composed msg
        PrepareLzCallReturn memory _prepareLzCallReturn1_ = _prepareLzCall(
            _dstEid,
            _oft,
            _usdoHelper,
            amount,
            _sendType,
            ComposeMsgData({
                index: 0,
                gas: 0,
                value: 0,
                data: bytes(""),
                prevData: bytes(""),
                prevOptionsData: bytes("")
            }),
            500_000, //TODO: what should we input here?
            0
        );
        sendParam_ = _prepareLzCallReturn1_.lzSendParam;
        sendParamFee_ = _prepareLzCallReturn1_.msgFee;

        PrepareLzCallReturn memory _prepareLzCallReturn2_ = _prepareLzCall(
            _dstEid,
            _oft,
            _usdoHelper,
            amount,
            _composeMsgType,
            ComposeMsgData({
                index: 0,
                gas: _composeGas,
                value: sendParamFee_.nativeFee.toUint128(),
                data: _composeMsg,
                prevData: bytes(""),
                prevOptionsData: bytes("")
            }),
            500_000,
            0
        );

        (msgReceipt_,) = IOftSender(_oft).sendPacket{value: _prepareLzCallReturn2_.msgFee.nativeFee}(
            _prepareLzCallReturn2_.lzSendParam, _prepareLzCallReturn2_.composeMsg
        );
    }
}
