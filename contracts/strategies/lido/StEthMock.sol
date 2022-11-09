// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '../../mixologist/legacy/mocks/ERC20Mock.sol';

contract StEthMock is ERC20Mock {
    constructor(uint256 initialSupply) ERC20Mock(initialSupply) {}

    function submit(address) external payable returns (uint256) {
        freeMint(msg.value);

        transfer(msg.sender, msg.value);

        return msg.value;
    }

    function isStakingPaused() external pure returns (bool) {
        return false;
    }

    receive() external payable {}
}
