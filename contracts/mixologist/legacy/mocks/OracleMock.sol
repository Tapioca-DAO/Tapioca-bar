// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '../../interfaces/IOracle.sol';

contract OracleMock is IOracle {
    uint256 public rate;
    bool public success;

    constructor() {
        success = true;
    }

    function set(uint256 rate_) public {
        // The rate can be updated.
        rate = rate_;
    }

    function setSuccess(bool val) public {
        success = val;
    }

    function getDataParameter() public pure returns (bytes memory) {
        return abi.encode('0x0');
    }

    // Get the latest exchange rate
    function get(bytes calldata) public view override returns (bool, uint256) {
        return (success, rate);
    }

    // Check the last exchange rate without any state changes
    function peek(bytes calldata) public view override returns (bool, uint256) {
        return (success, rate);
    }

    function peekSpot(bytes calldata) public view override returns (uint256) {
        return rate;
    }

    function name(bytes calldata) public pure override returns (string memory) {
        return 'Test';
    }

    function symbol(bytes calldata)
        public
        pure
        override
        returns (string memory)
    {
        return 'TEST';
    }
}
