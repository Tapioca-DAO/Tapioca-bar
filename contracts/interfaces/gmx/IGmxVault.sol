// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGmxVault {
    // Price precision is 1e30..
    function getMinPrice(address _token) external view returns (uint256);

    function getMaxPrice(address _token) external view returns (uint256);
}
