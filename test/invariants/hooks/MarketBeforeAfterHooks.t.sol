// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {console} from "forge-std/console.sol";

// Test Helpers
import {Pretty, Strings} from "../utils/Pretty.sol";

// Test Contracts
import {BaseHooks} from "../base/BaseHooks.t.sol";

// Interfaces
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {ITarget} from "test/invariants/base/BaseTest.t.sol";

/// @title Market Before After Hooks
/// @notice Helper contract for before and after hooks
/// @dev This contract is inherited by handlers
abstract contract MarketBeforeAfterHooks is BaseHooks {
    using Strings for string;
    using Pretty for uint256;
    using Pretty for int256;
    using Pretty for bool;

    struct MarketVars {
        // LTV
        uint256 totalElasticBefore;
        uint256 totalElasticAfter;
        uint256 totalCollateralShareBefore;
        uint256 totalCollateralShareAfter;
        // Borrow Cap
        uint256 totalBorrowCapBefore;
        uint256 totalBorrowCapAfter;
        // Borrows
        uint256 totalBorrowElasticBefore;
        uint256 totalBorrowElasticAfter;
        uint256 totalBorrowBaseBefore;
        uint256 totalBorrowBaseAfter;
        // Exchange Rate
        uint256 exchangeRateBefore;
        uint256 exchangeRateAfter;
        // Collateral
        uint256 collateralizationrateBefore;
        uint256 collateralizationrateAfter;
        uint256 actorCollateralShareBefore;
        uint256 actorCollateralShareAfter;
        // Assets
        uint256 totalSupplyBefore;
        uint256 totalSupplyAfter;
        // Liquidation
        uint256 liquidationBonusAmountBefore;
        uint256 liquidationBonusAmountAfter;
        uint256 liquidationCollateralizationRateBefore;
        uint256 liquidationCollateralizationRateAfter;
        bool isSolventBefore;
        bool isSolventAfter;
        // Interest
        uint64 lastAccruedTimestampBefore;
        uint64 lastAccruedTimestampAfter;
    }

    MarketVars marketVars;

    struct SingularityVars {
        // Rebase
        uint256 totalElasticBefore;
        uint256 totalElasticAfter;
        uint256 totalBaseBefore;
        uint256 totalBaseAfter;
    }

    SingularityVars singularityVars;

    struct BigBangVars {
        // Rebase
        uint256 totalSystemValueBefore;
        uint256 totalSystemValueAfter;
    }

    BigBangVars bigBangVars;

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                              HOOKS                                        //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function _marketBefore() internal {
        IMarket m = IMarket(target);
        // LTV
        (marketVars.totalElasticBefore,) = m.totalBorrow();
        marketVars.totalCollateralShareBefore = m.totalCollateralShare();
        // Borrow Cap
        marketVars.totalBorrowCapBefore = m.totalBorrowCap();
        // Borrows
        (marketVars.totalBorrowElasticBefore, marketVars.totalBorrowBaseBefore) = m.totalBorrow();
        // Exchange Rate
        marketVars.exchangeRateBefore = m.exchangeRate();
        // Collateral
        marketVars.totalCollateralShareBefore = m.totalCollateralShare();
        marketVars.collateralizationrateBefore = m.collateralizationRate();
        marketVars.actorCollateralShareBefore = m.userCollateralShare(address(actor));
        // Liquidation
        marketVars.liquidationBonusAmountBefore = m.liquidationBonusAmount();
        marketVars.liquidationCollateralizationRateBefore = m.liquidationCollateralizationRate();
        marketVars.isSolventBefore = _isSolvent(address(actor), marketVars.exchangeRateBefore, false);
        // Interest
        (, marketVars.lastAccruedTimestampBefore) = ITarget(target).accrueInfo();
    }

    function _marketAfter() internal {
        IMarket m = IMarket(target);
        // LTV
        (marketVars.totalElasticAfter,) = m.totalBorrow();
        marketVars.totalCollateralShareAfter = m.totalCollateralShare();
        // Borrow Cap
        marketVars.totalBorrowCapAfter = m.totalBorrowCap();
        // Borrows
        (marketVars.totalBorrowElasticAfter, marketVars.totalBorrowBaseAfter) = m.totalBorrow();
        // Exchange Rate
        marketVars.exchangeRateAfter = m.exchangeRate();
        // Collateral
        marketVars.totalCollateralShareAfter = m.totalCollateralShare();
        marketVars.collateralizationrateAfter = m.collateralizationRate();
        marketVars.actorCollateralShareAfter = m.userCollateralShare(address(actor));
        // Liquidation
        marketVars.liquidationBonusAmountAfter = m.liquidationBonusAmount();
        marketVars.liquidationCollateralizationRateAfter = m.liquidationCollateralizationRate();
        marketVars.isSolventAfter = _isSolvent(address(actor), marketVars.exchangeRateAfter, false);
        // Interest
        (, marketVars.lastAccruedTimestampAfter) = ITarget(target).accrueInfo();
    }

    function _singularityBefore() internal onlyTargetMarket(MarketType.SINGULARITY) {
        // Rebase
        (singularityVars.totalElasticBefore, singularityVars.totalBaseBefore) = singularity.totalAsset();
    }

    function _singularityAfter() internal onlyTargetMarket(MarketType.SINGULARITY) {
        IMarket m = IMarket(target);
        // Rebase
        (singularityVars.totalElasticAfter, singularityVars.totalBaseAfter) = singularity.totalAsset();
    }

    function _bigBangBefore() internal onlyTargetMarket(MarketType.BIGBANG) {
        bigBangVars.totalSystemValueBefore = _getTotalSystemValueBigBang();
    }

    function _bigBangAfter() internal onlyTargetMarket(MarketType.BIGBANG) {
        bigBangVars.totalSystemValueAfter = _getTotalSystemValueBigBang();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                    MARKET POST CONDITIONS                                 //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_MARKET_INVARIANT_F() internal {
        assertLe(
            marketVars.lastAccruedTimestampBefore, 
            marketVars.lastAccruedTimestampAfter,
            MARKET_INVARIANT_F
            );
    }

    function assert_COMMON_INVARIANT_O(uint256 shares) internal {
/*         assertTrue(
            shares != 0, 
            COMMON_INVARIANT_O2
            ); */
        assertEq(
            marketVars.totalCollateralShareBefore + shares, 
            marketVars.totalCollateralShareAfter, 
            COMMON_INVARIANT_O
            );
    }

    function assert_LENDING_INVARIANT_C(uint256 shares) internal {
/*         assertTrue(
            shares != 0, 
            LENDING_INVARIANT_C2
            ); */
        // LTV
        assertEq(
            marketVars.totalCollateralShareBefore - shares, 
            marketVars.totalCollateralShareAfter, 
            LENDING_INVARIANT_C
            );
    }

    function assert_BORROWING_INVARIANT_C(uint256 borrowAmount) internal {
        if (borrowAmount == 0) {
            return;
        }
        assertTrue(
            marketVars.actorCollateralShareAfter != 0, 
            BORROWING_INVARIANT_C
            );
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                   BIGBANG POST CONDITIONS                                 //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_BIGBANG_INVARIANT_G() internal {
        // Repayments do not increase the total system debt
        assertGe(
            marketVars.totalElasticBefore, 
            marketVars.totalElasticAfter, 
            BIGBANG_INVARIANT_G
            );
    }

    function assert_BIGBANG_INVARIANT_H() internal {
        // The total system value does not decrease during repayments
        assertLe(
            bigBangVars.totalSystemValueBefore, 
            bigBangVars.totalSystemValueAfter, 
            BIGBANG_INVARIANT_H
            );
    }

    function assert_COMMON_INVARIANT_N() internal {
        // The total system value does not decrease during repayments
        assertLe(
            bigBangVars.totalSystemValueBefore, 
            bigBangVars.totalSystemValueAfter, 
            COMMON_INVARIANT_N
            );
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                  SINGULARITY POST CONDITIONS                              //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_RB_INVARIANT_G() internal {
        // Ratio elastic / base monotonically increases
        if (singularityVars.totalBaseBefore == 0) {
            return;
        }

        assertLe(
            singularityVars.totalElasticBefore * 1e18 / singularityVars.totalBaseBefore, 
            singularityVars.totalElasticAfter * 1e18 / singularityVars.totalBaseAfter, 
            RB_INVARIANT_G
            );
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                    REBASE POST CONDITIONS                                 //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_RB_INVARIANT_D() internal {
        // Ratio elastic / base monotonically increases
        if (marketVars.totalBorrowBaseBefore == 0) {
            return;
        }
        assertLe(
            marketVars.totalBorrowElasticBefore * 1e18 / marketVars.totalBorrowBaseBefore, 
            marketVars.totalBorrowElasticAfter * 1e18 / marketVars.totalBorrowBaseAfter, 
            RB_INVARIANT_D
            );
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                   LIQUIDATION POST CONDITIONS                             //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_LIQUIDATION_INVARIANT_G() internal {
        // Liquidations never work when an account is not liquidatable
        // TODO
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      GLOBAL POST CONDITIONS                               //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_GLOBAL_INVARIANT_B() internal {
        // Repayments do not increase the total system debt
        if (marketVars.isSolventBefore) {
            assertTrue(marketVars.isSolventAfter, GLOBAL_INVARIANT_B);
        }
    }
}
