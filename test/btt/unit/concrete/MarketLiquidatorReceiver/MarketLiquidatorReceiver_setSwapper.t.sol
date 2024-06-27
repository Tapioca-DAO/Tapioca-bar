// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;


contract MarketLiquidatorReceiver_setSwappertsol {
    function test_RevertWhen_TheCallerIsNotTheOwner() external {
        // it should revert
    }

    function test_WhenTheCallerIsTheOwner() external {
        // it should not revert
        // it should emit SwapperAssigned event
    }
}
