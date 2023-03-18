// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

interface IBigBang {
    struct AccrueInfo {
        uint64 debtRate;
        uint64 lastAccrued;
    }

    function accrueInfo()
        external
        view
        returns (uint64 debtRate, uint64 lastAccrued);

    function addCollateral(
        address from,
        address to,
        bool skim,
        uint256 amount,
        uint256 share
    ) external;
}
