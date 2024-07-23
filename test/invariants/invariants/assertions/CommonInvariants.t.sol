// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Test Contracts
import {Actor} from "../../utils/Actor.sol";
import {HandlerAggregator} from "../../HandlerAggregator.t.sol";

// Interfaces
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {IBigBang} from "tapioca-periph/interfaces/bar/IBigBang.sol";

/// @title CommonInvariants
/// @notice Implements Invariants for the protocol
/// @notice Implements View functions assertions for the protocol, checked in assertion testing mode
/// @dev Inherits HandlerAggregator for checking actions in assertion testing mode
abstract contract CommonInvariants is HandlerAggregator {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      COMMON INVARIANTS                                    //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_COMMON_INVARIANT_A(address user) internal {
        if (IMarket(target)._userBorrowPart(user) > 0) {
            assertGt(IMarket(target)._totalCollateralShare(), 0, COMMON_INVARIANT_A);
        }
    }

    function assert_COMMON_INVARIANT_B() internal {
        (uint256 totalBorrowElastic,) = IMarket(target)._totalBorrow();
        if (totalBorrowElastic != 0) {
            assertGt(IMarket(target)._totalCollateralShare(), 0, COMMON_INVARIANT_B);
        }
    }

    function assert_COMMON_INVARIANT_D(address _actor) internal {
        if (IMarket(target)._userBorrowPart(_actor) != 0) {
            assertGt(IMarket(target)._totalCollateralShare(), 0, COMMON_INVARIANT_D);
        }
    }

    function assert_COMMON_INVARIANT_C() internal {
        assertGe(yieldbox.balanceOf(target, IMarket(target)._collateralId()), IMarket(target)._totalCollateralShare(), COMMON_INVARIANT_C);
    }

    function assert_COMMON_INVARIANT_F() internal {
        try IBigBang(target).accrue() {
        } catch (bytes memory _data) {
            assertTrue(false, COMMON_INVARIANT_F);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      GLOBAL INVARIANTS                                    //
    ///////////////////////////////////////////////////////////////////////////////////////////////

}
