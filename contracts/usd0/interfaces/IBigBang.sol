// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IBigBang {
    struct AccrueInfo {
        uint64 debtRate;
        uint64 lastAccrued;
    }

    function accrueInfo()
        external
        view
        returns (uint64 debtRate, uint64 lastAccrued);
}
