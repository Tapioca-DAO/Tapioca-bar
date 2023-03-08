// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract ExternalFunctionMock {
    event Result(uint256 output);

    function sum(uint256 a, uint256 b) external returns (uint256 c) {
        c = a + b;
        emit Result(c);
    }
}
