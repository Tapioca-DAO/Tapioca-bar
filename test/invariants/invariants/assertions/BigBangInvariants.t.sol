// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Test Contracts
import {Actor} from "../../utils/Actor.sol";
import {HandlerAggregator} from "../../HandlerAggregator.t.sol";

/// @title BigBangInvariants
/// @notice Implements Invariants for the protocol
/// @notice Implements View functions assertions for the protocol, checked in assertion testing mode
/// @dev Inherits HandlerAggregator for checking actions in assertion testing mode
abstract contract BigBangInvariants is HandlerAggregator {
    function assert_BIGBANG_INVARIANT_A() internal {
        assertGe(bigBang.maxMintFeeStart(), bigBang.minMintFeeStart(), BIGBANG_INVARIANT_A);
    }

    function assert_BIGBANG_INVARIANT_B() internal {
        assertGe(bigBang.maxMintFee(), bigBang.minMintFee(), BIGBANG_INVARIANT_B);
    }

    function assert_BIGBANG_INVARIANT_C() internal {
        assertGe(bigBang.maxDebtRate(), bigBang.minDebtRate(), BIGBANG_INVARIANT_C);
    }

    function assert_BIGBANG_INVARIANT_D() internal {
        assertLe(bigBang.getDebtRate(), bigBang.maxDebtRate(), BIGBANG_INVARIANT_D);
        assertGe(bigBang.getDebtRate(), bigBang.minDebtRate(), BIGBANG_INVARIANT_D);
    }

    function assert_BIGBANG_INVARIANT_E() internal {
        try bigBang.getDebtRate() {
        } catch {
            fail(BIGBANG_INVARIANT_E);
        }
    }

    function assert_BIGBANG_INVARIANT_F() internal {
        assertEq(
            usdo.totalSupply() + bigBang.openInterestDebt(), 
            bigBang._totalBorrow().elastic, 
            BIGBANG_INVARIANT_F);
    }
}   
