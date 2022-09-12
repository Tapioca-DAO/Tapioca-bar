// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IMixologistLendingBorrowing {
    function borrow(
        address from,
        address to,
        uint256 amount
    ) external returns (uint256 part, uint256 share);
}
