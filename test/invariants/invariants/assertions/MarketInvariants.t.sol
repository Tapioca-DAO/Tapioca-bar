// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Contracts
import {MarketStateView as Market} from "contracts/markets/MarketStateView.sol";

// Test Contracts
import {Actor} from "../../utils/Actor.sol";
import {HandlerAggregator} from "../../HandlerAggregator.t.sol";

// Interfaces
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {ITarget} from "test/invariants/base/BaseTest.t.sol";

/// @title MarketInvariants
/// @notice Implements Invariants for the protocol
/// @notice Implements View functions assertions for the protocol, checked in assertion testing mode
/// @dev Inherits HandlerAggregator for checking actions in assertion testing mode
abstract contract MarketInvariants is HandlerAggregator {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      MARKET INVARIANTS                                    //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_MARKET_INVARIANT_A() internal {
        assertLe(Market(target)._protocolFee(), BASE_POINTS, MARKET_INVARIANT_A);
    }

    function assert_MARKET_INVARIANT_B() internal {
        assertLe(Market(target)._minLiquidatorReward(), Market(target)._maxLiquidatorReward(), MARKET_INVARIANT_B);
    }

    function assert_MARKET_INVARIANT_C(address user) internal {
        uint256 liquidationReward = Market(target).computeLiquidatorReward(user, IMarket(target)._exchangeRate());
        if (liquidationReward == 0) {
            return;
        }
        assertLe(Market(target)._minLiquidatorReward(), liquidationReward, MARKET_INVARIANT_C);
    }

    function assert_MARKET_INVARIANT_E() internal {
        (, uint64 lastAccrued) = targetContract.accrueInfo();
        assertLe(lastAccrued, block.timestamp, MARKET_INVARIANT_E);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                    BORROWING INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_BORROWING_INVARIANT_A() internal {
        (, uint256 base) = IMarket(target)._totalBorrow();
        assertEq(ghost_totalBorrowBase, base, BORROWING_INVARIANT_A);
    }

    function assert_BORROWING_INVARIANT_B(uint256 sumUserBorrowPart) internal {
        assertEq(sumUserBorrowPart, ghost_totalBorrowBase, BORROWING_INVARIANT_B);
    }

    function assert_BORROWING_INVARIANT_D(uint256 sumUserBorrowPart) internal {
        (, uint256 base) = IMarket(target)._totalBorrow();
        assertEq(sumUserBorrowPart, base, BORROWING_INVARIANT_D);
    }

    function assert_BORROWING_INVARIANT_E(uint256 sumUserElasticDebt) internal {
        (uint256 elastic,) = IMarket(target)._totalBorrow();
        assertApproxEqAbs(sumUserElasticDebt, elastic, NUMBER_OF_ACTORS, BORROWING_INVARIANT_E);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                     LENDING INVARIANTS                                    //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_LENDING_INVARIANT_D(uint256 sumUserCollateralShare) internal {
        assertEq(sumUserCollateralShare, Market(target)._totalCollateralShare(), LENDING_INVARIANT_A);
    }

    function assert_LENDING_INVARIANT_H() internal {
        assertEq(Market(target)._totalCollateralShare(), ghost_totalCollateralShare, LENDING_INVARIANT_H);
    }

    function assert_LENDING_INVARIANT_I(uint256 sumGhostUserCollateralShare) internal {
        assertEq(Market(target)._totalCollateralShare(), ghost_totalCollateralShare, LENDING_INVARIANT_I);
    }
}
