// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {console} from "forge-std/console.sol";

// Test Helpers
import {Pretty, Strings} from "../utils/Pretty.sol";

// Test Contracts
import {BaseHooks} from "../base/BaseHooks.t.sol";

// Interfaces
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";

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
        // Liquidation
        uint256 liquidationBonusAmountBefore;
        uint256 liquidationBonusAmountAfter;
        uint256 liquidationCollateralizationRateBefore;
        uint256 liquidationCollateralizationRateAfter;
    }

    MarketVars marketVars;

    function _marketBefore() internal {
        IMarket m = IMarket(target);
        // LTV
        (marketVars.totalElasticBefore,) = m.totalBorrow();
        marketVars.totalCollateralShareBefore = m.totalCollateralShare();
        // TODO: check which ones of the ones below are or arent needed
        marketVars.totalBorrowCapBefore = m.totalBorrowCap();
        marketVars.totalCollateralShareBefore = m.totalCollateralShare();
        (marketVars.totalBorrowElasticBefore, marketVars.totalBorrowBaseBefore) = m.totalBorrow();
        marketVars.exchangeRateBefore = m.exchangeRate();
        marketVars.collateralizationrateBefore = m.collateralizationRate();
        marketVars.liquidationBonusAmountBefore = m.liquidationBonusAmount();
        marketVars.liquidationCollateralizationRateBefore = m.liquidationCollateralizationRate();
    }

    function _marketAfter() internal {
        IMarket m = IMarket(target);
        // LTV
        (marketVars.totalElasticAfter,) = m.totalBorrow();
        marketVars.totalCollateralShareAfter = m.totalCollateralShare();
        // TODO: check which ones of the ones below are or arent needed
        marketVars.totalBorrowCapAfter = m.totalBorrowCap();
        marketVars.totalCollateralShareAfter = m.totalCollateralShare();
        (marketVars.totalBorrowElasticAfter, marketVars.totalBorrowBaseAfter) = m.totalBorrow();
        marketVars.exchangeRateAfter = m.exchangeRate();
        marketVars.collateralizationrateAfter = m.collateralizationRate();
        marketVars.liquidationBonusAmountAfter = m.liquidationBonusAmount();
        marketVars.liquidationCollateralizationRateAfter = m.liquidationCollateralizationRate();
    }
}
