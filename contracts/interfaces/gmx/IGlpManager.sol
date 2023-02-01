// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGlpManager {
    function getPrice(bool _maximise) external view returns (uint256);

    function getAum(bool _maximise) external view returns (uint256);

    function vault() external pure returns (address);
}
