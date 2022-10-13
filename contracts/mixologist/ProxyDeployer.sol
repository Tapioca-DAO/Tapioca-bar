// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import './MXProxy.sol';

contract ProxyDeployer {
    address public owner;
    address[] public proxies;

    event LogDeploy(address indexed lzEndpoint, address indexed cloneAddress);

    constructor() {
        owner = msg.sender;
    }

    function proxiesCount() external view returns (uint256) {
        return proxies.length;
    }

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
