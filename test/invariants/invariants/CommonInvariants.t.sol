// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";

// Test Contracts
import {Actor} from "../utils/Actor.sol";
import {HandlerAggregator} from "../HandlerAggregator.t.sol";

/// @title CommonInvariants
/// @notice Implements Invariants for the protocol
/// @notice Implements View functions assertions for the protocol, checked in assertion testing mode
/// @dev Inherits HandlerAggregator for checking actions in assertion testing mode
abstract contract CommonInvariants is HandlerAggregator {
    function assert_COMMON_INVARIANT_C() internal {
        assertGe(yieldbox.balanceOf(target, IMarket(target).collateralId()), IMarket(target).totalCollateralShare(), COMMON_INVARIANT_C);
    }
}
