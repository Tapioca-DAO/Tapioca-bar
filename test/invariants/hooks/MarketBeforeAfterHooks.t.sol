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
        (marketVars.totalElasticBefore,) = m._totalBorrow();
        marketVars.totalCollateralShareBefore = m._totalCollateralShare();
        // Borrow Cap
        marketVars.totalBorrowCapBefore = m._totalBorrowCap();
        // Borrows
        (marketVars.totalBorrowElasticBefore, marketVars.totalBorrowBaseBefore) = m._totalBorrow();
        // Exchange Rate
        marketVars.exchangeRateBefore = m._exchangeRate();
        // Collateral
        marketVars.totalCollateralShareBefore = m._totalCollateralShare();
        marketVars.collateralizationrateBefore = m._collateralizationRate();
        marketVars.actorCollateralShareBefore = m._userCollateralShare(address(actor));
        // Liquidation
        marketVars.liquidationBonusAmountBefore = m._liquidationBonusAmount();
        marketVars.liquidationCollateralizationRateBefore = m._liquidationCollateralizationRate();
        marketVars.isSolventBefore = _isSolvent(address(actor), _updatedExchangeRate(), false);
        // Interest
        (, marketVars.lastAccruedTimestampBefore) = targetContract.accrueInfo();
    }

    function _marketAfter() internal {
        IMarket m = IMarket(target);
        // LTV
        (marketVars.totalElasticAfter,) = m._totalBorrow();
        marketVars.totalCollateralShareAfter = m._totalCollateralShare();
        // Borrow Cap
        marketVars.totalBorrowCapAfter = m._totalBorrowCap();
        // Borrows
        (marketVars.totalBorrowElasticAfter, marketVars.totalBorrowBaseAfter) = m._totalBorrow();
        // Exchange Rate
        marketVars.exchangeRateAfter = m._exchangeRate();
        // Collateral
        marketVars.totalCollateralShareAfter = m._totalCollateralShare();
        marketVars.collateralizationrateAfter = m._collateralizationRate();
        marketVars.actorCollateralShareAfter = m._userCollateralShare(address(actor));
        // Liquidation
        marketVars.liquidationBonusAmountAfter = m._liquidationBonusAmount();
        marketVars.liquidationCollateralizationRateAfter = m._liquidationCollateralizationRate();
        marketVars.isSolventAfter = _isSolvent(address(actor), marketVars.exchangeRateAfter, false);
        // Interest
        (, marketVars.lastAccruedTimestampAfter) = targetContract.accrueInfo();
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
        assertEq(
            marketVars.totalCollateralShareBefore + shares, 
            marketVars.totalCollateralShareAfter, 
            COMMON_INVARIANT_O
            );
    }

    function assert_LENDING_INVARIANT_C(uint256 shares) internal {
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
            marketVars.totalCollateralShareBefore != 0, 
            BORROWING_INVARIANT_C
            );
    }

    function assert_BORROWING_INVARIANT_F() internal {
        assertTrue(
            marketVars.isSolventBefore, 
            BORROWING_INVARIANT_F
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
        console.log("totalBorrowElasticBefore: ", marketVars.totalBorrowElasticBefore);
        console.log("totalBorrowBaseBefore: ", marketVars.totalBorrowBaseBefore);
        console.log("totalBorrowElasticAfter: ", marketVars.totalBorrowElasticAfter);
        console.log("totalBorrowBaseAfter: ", marketVars.totalBorrowBaseAfter);
        assertLe(//TODO check why this breaks
            marketVars.totalBorrowElasticBefore * 1e18 / marketVars.totalBorrowBaseBefore, 
            marketVars.totalBorrowElasticAfter * 1e18 / marketVars.totalBorrowBaseAfter, 
            RB_INVARIANT_D
            );
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                   LIQUIDATION POST CONDITIONS                             //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_LIQUIDATION_INVARIANT_G(bool liquidatable) internal {
        // Liquidations never work when an account is not liquidatable
        assertTrue(
            liquidatable, 
            LIQUIDATION_INVARIANT_G
            );
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      GLOBAL POST CONDITIONS                               //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_GLOBAL_INVARIANT_B() internal {
        // Repayments do not increase the total system debt

/*         if (marketVars.isSolventBefore) {
            assertTrue(marketVars.isSolventAfter, GLOBAL_INVARIANT_B);//TODO check this invariant out
        } */
    }
}
