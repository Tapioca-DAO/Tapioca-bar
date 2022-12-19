// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../../tapioca-sdk/src/contracts/lzApp/NonblockingLzApp.sol';
import './interfaces/ISingularity.sol';

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
contract SGLProxy is NonblockingLzApp {
    // ************ //
    // *** VARS *** //
    // ************ //
    bool public useCustomAdapterParams;
    bool public enforceSameAddress;

    // Address of the whitelisted Singularity contracts
    mapping(address => bool) public singularities;

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
    event LogSingularityStatus(address indexed singularity, bool status);
    event LogEnforce(bool _old, bool _new);

    /// @notice creates a new SGLProxy contract
    /// @param _lzEndpoint LayerZero endpoint address
    /// @param _owner contract's owner address
    constructor(address _lzEndpoint, address _owner)
        NonblockingLzApp(_lzEndpoint)
    {
        _transferOwnership(_owner);
        enforceSameAddress = true;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice execute Singularity methods on another chain
    /// @param _dstChainId te LayerZero destination chain id
    /// @param _mixologistDstAddress destination Singularity address
    /// @param _sglCalls Singularity calls
    /// @param _adapterParams custom adapters
    function executeOnChain(
        uint16 _dstChainId,
        bytes memory _mixologistDstAddress,
        bytes[] memory _sglCalls,
        bytes memory _adapterParams
    ) external payable {
        uint256 chainId = lzEndpoint.getChainId();
        require(chainId != _dstChainId, 'SGLProxy: Chain not valid');

        _send(
            msg.sender,
            _dstChainId,
            _mixologistDstAddress,
            _sglCalls,
            payable(msg.sender),
            address(0),
            _adapterParams
        );
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice set whitelist status for Singularity
    /// @dev callable by owner
    /// @param _mixologist the Singularity address
    /// @param _status whitelisted/not
    function updateSingularityStatus(address _mixologist, bool _status)
        external
        onlyOwner
    {
        singularities[_mixologist] = _status;
        emit LogSingularityStatus(_mixologist, _status);
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

    //TODO: TBD; remove as we already have trustedRemotes
    /// @notice enforces CREATE2 proxies
    /// @param _val true/false
    function setEnforceSameAddress(bool _val) external onlyOwner {
        emit LogEnforce(enforceSameAddress, _val);
        enforceSameAddress = _val;
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @notice override of the '_nonblockingLzReceive' method
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory, /*_srcAddress*/
        uint64, /*_nonce*/
        bytes memory _sglPayload
    ) internal override {
        // decode and load the toAddress
        (
            bytes memory fromAddressBytes,
            bytes memory toAddressBytes,
            bytes[] memory sglCalls
        ) = abi.decode(_sglPayload, (bytes, bytes, bytes[]));

        address fromAddress;
        assembly {
            fromAddress := mload(add(fromAddressBytes, 20))
        }
        if (enforceSameAddress) {
            require(fromAddress == address(this), 'SGLProxy: not proxy'); //should have the same address
        }

        address toAddress;
        assembly {
            toAddress := mload(add(toAddressBytes, 20))
        }
        require(singularities[toAddress], 'SGLProxy: Invalid Singularity');

        ISingularity(toAddress).execute(sglCalls, true);

        emit ReceiveFromChain(_srcChainId, toAddress, _sglPayload);
    }

    /// @notice override of the '_send' method
    function _send(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        bytes[] memory _sglCalls,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) internal {
        bytes memory sglPayload = abi.encode(
            abi.encodePacked(address(this)),
            _toAddress,
            _sglCalls
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
            sglPayload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams,
            msg.value
        );

        emit SendToChain(_dstChainId, _from, sglPayload);
    }
}
