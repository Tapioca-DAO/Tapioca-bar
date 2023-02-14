// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import 'tapioca-sdk/dist/contracts/lzApp/NonblockingLzApp.sol';

import './interfaces/IMarket.sol';

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
/// @title Omnichain proxy for Singularity
contract MarketsProxy is NonblockingLzApp {
    // ************ //
    // *** VARS *** //
    // ************ //
    bool public useCustomAdapterParams;

    // Address of the whitelisted Singularity contracts
    mapping(address => bool) public markets;

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 public constant NO_EXTRA_GAS = 0;
    uint256 public constant FUNCTION_TYPE_SEND = 1;

    // ************** //
    // *** EVENTS *** //
    // ************** //

    event ReceiveFromChain(
        uint16 indexed _srcChainId,
        address indexed _dstSingularity,
        bytes _sglPayload
    );
    event SendToChain(
        uint16 indexed _srcChainId,
        address indexed _srcAddress,
        bytes _sglPayload
    );
    event SetUseCustomAdapterParams(bool _useCustomAdapterParams);
    event LogMarketStatus(address indexed singularity, bool status);

    /// @notice creates a new SGLProxy contract
    /// @param _lzEndpoint LayerZero endpoint address
    /// @param _owner contract's owner address
    constructor(address _lzEndpoint, address _owner)
        NonblockingLzApp(_lzEndpoint)
    {
        _transferOwnership(_owner);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice execute Singularity methods on another chain
    /// @param _dstChainId te LayerZero destination chain id
    /// @param _marketDstAddress destination Market address
    /// @param _marketCalls Market calls
    /// @param _adapterParams custom adapters
    function executeOnChain(
        uint16 _dstChainId,
        address _marketDstAddress,
        bytes[] memory _marketCalls,
        bytes memory _adapterParams
    ) external payable {
        uint256 chainId = lzEndpoint.getChainId();
        require(chainId != _dstChainId, 'MarketsProxy: chain not valid');

        _send(
            msg.sender,
            _dstChainId,
            _marketDstAddress,
            _marketCalls,
            payable(msg.sender),
            address(0),
            _adapterParams
        );
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice set whitelist status for market
    /// @dev callable by owner
    /// @param _market the market address
    /// @param _status whitelisted/not
    function updateMarketStatus(address _market, bool _status)
        external
        onlyOwner
    {
        markets[_market] = _status;
        emit LogMarketStatus(_market, _status);
    }

    /// @notice set custom adapter usage status
    /// @param _useCustomAdapterParams true/false
    function setUseCustomAdapterParams(bool _useCustomAdapterParams)
        external
        onlyOwner
    {
        useCustomAdapterParams = _useCustomAdapterParams;
        emit SetUseCustomAdapterParams(_useCustomAdapterParams);
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @notice override of the '_nonblockingLzReceive' method
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory, /*_srcAddress*/
        uint64, /*_nonce*/
        bytes memory _payload
    ) internal override {
        // decode and load the toAddress
        (, address toAddress, bytes[] memory marketCalls) = abi.decode(
            _payload,
            (bytes32, address, bytes[])
        );

        require(markets[toAddress], 'MarketsProxy: market not valid');

        IMarket(toAddress).execute(marketCalls, true);

        emit ReceiveFromChain(_srcChainId, toAddress, _payload);
    }

    /// @notice override of the '_send' method
    function _send(
        address _from,
        uint16 _dstChainId,
        address _toAddress,
        bytes[] memory _marketCalls,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) internal {
        bytes memory payload = abi.encode(
            abi.encodePacked(address(this)),
            _toAddress,
            _marketCalls
        );
        if (useCustomAdapterParams) {
            _checkGasLimit(
                _dstChainId,
                uint16(FUNCTION_TYPE_SEND),
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
            payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams,
            msg.value
        );

        emit SendToChain(_dstChainId, _from, payload);
    }
}
