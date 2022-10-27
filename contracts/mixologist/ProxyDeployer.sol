// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import './MXProxy.sol';

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

/// @title MXProxy factory
contract ProxyDeployer {
    // ************ //
    // *** VARS *** //
    // ************ //
    address public owner;
    address[] public proxies;

    // ************ //
    // *** EVENTS *** //
    // ************ //
    event LogDeploy(address indexed lzEndpoint, address indexed cloneAddress);

    // ************ //
    // *** METHODS *** //
    // ************ //
    /// @notice creates a new ProxyDeployer contract
    constructor() {
        owner = msg.sender;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns proxies count
    function proxiesCount() external view returns (uint256) {
        return proxies.length;
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice creates a new MXProxy contract using CREATE2 opcode
    /// @param _lzEndpoint the LayerZero endpoint MXProxy will be associated with
    /// @param _salt CREATE2 salt used to compute the new address
    function deployWithCreate2(address _lzEndpoint, bytes32 _salt)
        public
        payable
        returns (address cloneAddress)
    {
        require(msg.sender == owner, 'ProxyDeployer: unauthorized');
        // https://docs.soliditylang.org/en/latest/control-structures.html#salted-contract-creations-create2
        cloneAddress = address(new MXProxy{salt: _salt}(_lzEndpoint, owner));
        proxies.push(cloneAddress);
        emit LogDeploy(_lzEndpoint, cloneAddress);
    }
}
