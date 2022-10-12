// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import 'tapioca-sdk/src/contracts/lzApp/NonblockingLzApp.sol';
import './Mixologist.sol';

contract MXProxy is NonblockingLzApp {
    uint256 public constant NO_EXTRA_GAS = 0;
    uint256 public constant FUNCTION_TYPE_SEND = 1;
    bool public useCustomAdapterParams;

    // Address of the whitelisted Mixologist contracts
    mapping(address => bool) public mixologists;

    event ReceiveFromChain(
        uint16 indexed _srcChainId,
        address indexed _dstMixologist,
        bytes _mxPayload
    );
    event SendToChain(
        uint16 indexed _srcChainId,
        address indexed _srcAddress,
        bytes _mxPayload
    );
    event SetUseCustomAdapterParams(bool _useCustomAdapterParams);

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory/*_srcAddress*/,
        uint64, /*_nonce*/
        bytes memory _mxPayload
    ) internal override {
        // decode and load the toAddress
        (
            bytes memory toAddressBytes,
            bytes[] memory mxCalls
        ) = abi.decode(_mxPayload, (bytes, bytes[]));
        address toAddress;
        assembly {
            toAddress := mload(add(toAddressBytes, 20))
        }
        require(mixologists[toAddress], 'MXProxy: Invalid Mixologist');

        Mixologist(toAddress).execute(mxCalls, true);

        emit ReceiveFromChain(_srcChainId, toAddress, _mxPayload);
    }

    function _send(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        bytes[] memory _mxCalls,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) internal virtual {
        bytes memory mxPayload = abi.encode(_toAddress, _mxCalls);
        if (useCustomAdapterParams) {
            _checkGasLimit(
                _dstChainId,
                FUNCTION_TYPE_SEND,
                _adapterParams,
                NO_EXTRA_GAS
            );
        } else {
            require(
                _adapterParams.length == 0,
                'LzApp: _adapterParams must be empty.'
            );
        }
        _lzSend(
            _dstChainId,
            mxPayload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );

        emit SendToChain(_dstChainId, _from, mxPayload);
    }

    function setUseCustomAdapterParams(bool _useCustomAdapterParams)
        external
        onlyOwner
    {
        useCustomAdapterParams = _useCustomAdapterParams;
        emit SetUseCustomAdapterParams(_useCustomAdapterParams);
    }
}
