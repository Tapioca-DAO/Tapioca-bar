// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IFeeCollector {
    function feeRecipient() external view returns (address);
    function withdrawFees() external;
}
