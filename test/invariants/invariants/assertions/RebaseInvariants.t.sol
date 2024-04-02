// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";

// Test Contracts
import {Actor} from "../../utils/Actor.sol";
import {HandlerAggregator} from "../../HandlerAggregator.t.sol";

/// @title RebaseInvariants
/// @notice Implements Invariants for the protocol
/// @notice Implements View functions assertions for the protocol, checked in assertion testing mode
/// @dev Inherits HandlerAggregator for checking actions in assertion testing mode
abstract contract RebaseInvariants is HandlerAggregator {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                    YIELDBOX INVARIANTS                                    //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_RB_INVARIANT_A() internal {
        (uint256 elastic, uint256 base) = IMarket(target).totalBorrow();
        if (elastic == 0) {
            assertEq(base, 0, RB_INVARIANT_A);
        }
    }

    function assert_RB_INVARIANT_B() internal {
        (uint256 elastic, uint256 base) = IMarket(target).totalBorrow();
        assertGe(elastic, base, RB_INVARIANT_B);
    }

    function assert_RB_INVARIANT_C() internal {
        (uint256 elastic,) = IMarket(target).totalBorrow();
        assertGe(elastic, IMarket(target).totalBorrowCap(), RB_INVARIANT_C);
    }
}
