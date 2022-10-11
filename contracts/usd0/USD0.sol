// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import 'tapioca-sdk/dist/contracts/interfaces/ILayerZeroEndpoint.sol';
import 'tapioca-sdk/dist/contracts/token/oft/extension/PausableOFT.sol';

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

contract USD0 is PausableOFT {
    // ************** //
    // *** DATA *** //
    // ************** //
    /// @notice addresses allowed to mint USD0
    /// @dev chainId>address>status
    mapping(uint256 => mapping(address => bool)) public allowedMinter;
    /// @notice addresses allowed to burn USD0
    /// @dev chainId>address>status
    mapping(uint256 => mapping(address => bool)) public allowedBurner;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event Minted(address indexed _for, uint256 _amount);
    event Burned(address indexed _from, uint256 _amount);
    event SetMinterStatus(address indexed _for, bool _status);
    event SetBurnerStatus(address indexed _for, bool _status);

    // ************** //
    // *** METHODS *** //
    // ************** //
    /// @notice creates USDO0 OFT
    /// @param _lzEndpoint LayerZero endpoint
    constructor(address _lzEndpoint) PausableOFT('USD0', 'UDS0', _lzEndpoint) {
        uint256 chain = _getChainId();
        allowedMinter[chain][msg.sender] = true;
        allowedBurner[chain][msg.sender] = true;
    }

    //-- View methods --
    /// @notice returns token's decimals
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    //-- Write methods --
    /// @notice mints USD0
    /// @param _to receiver address
    /// @param _amount the amount to mint
    function mint(address _to, uint256 _amount) external {
        require(allowedMinter[_getChainId()][msg.sender], 'unauthorized');
        _mint(_to, _amount);
        emit Minted(_to, _amount);
    }

    /// @notice burns USD0
    /// @param _from address to burn from
    /// @param _amount the amount to burn
    function burn(address _from, uint256 _amount) external {
        require(allowedBurner[_getChainId()][msg.sender], 'unauthorized');
        _burn(_from, _amount);
        emit Burned(_from, _amount);
    }

    //-- Owner methods --
    /// @notice sets/unsets address as minter
    /// @param _for role receiver
    /// @param _status true/false
    function setMinterStatus(address _for, bool _status) external onlyOwner {
        allowedMinter[_getChainId()][_for] = _status;
        emit SetMinterStatus(_for, _status);
    }

    /// @notice sets/unsets address as burner
    /// @param _for role receiver
    /// @param _status true/false
    function setBurnerStatus(address _for, bool _status) external onlyOwner {
        allowedBurner[_getChainId()][_for] = _status;
        emit SetBurnerStatus(_for, _status);
    }

    //-- Private methods --
    /// @notice Return the current Layer-Zero "chain ID", not the actual `chainId` OPCODE output.
    /// @dev Useful for testing.
    function _getChainId() private view returns (uint256) {
        return ILayerZeroEndpoint(lzEndpoint).getChainId();
    }
}
