// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import '@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol';
import '../bar/BeachBar.sol';
import './Mixologist.sol';

/// @dev This contract provides useful helper functions for `Mixologist`.
contract MixologistHelper {
    using RebaseLibrary for Rebase;

    /// @dev Helper function to calculate the collateral shares that are needed for `borrowPart`,
    /// taking the current exchange rate into account.
    function getCollateralSharesForBorrowPart(Mixologist mixologist, uint256 borrowPart) public view returns (uint256) {
        // Taken from Mixologist
        uint256 EXCHANGE_RATE_PRECISION = 1e18;
        uint256 LIQUIDATION_MULTIPLIER = 112000; // add 12%
        uint256 LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

        (uint128 elastic, uint128 base) = mixologist.totalBorrow();
        Rebase memory totalBorrow = Rebase(elastic, base);
        uint256 borrowAmount = totalBorrow.toElastic(borrowPart, false);

        return
            mixologist.beachBar().toShare(
                mixologist.collateralId(),
                (borrowAmount * LIQUIDATION_MULTIPLIER * mixologist.exchangeRate()) /
                    (LIQUIDATION_MULTIPLIER_PRECISION * EXCHANGE_RATE_PRECISION),
                false
            );
    }

    /// @dev Compute the amount of `mixologist.assetId` from `fraction`
    /// `fraction` can be `mixologist.accrueInfo.feeFraction` or `mixologist.balanceOf`
    function getAmountForAssetFraction(Mixologist mixologist, uint256 fraction) public view returns (uint256) {
        (uint128 elastic, uint128 base) = mixologist.totalAsset();
        return mixologist.beachBar().toAmount(mixologist.assetId(), (fraction * elastic) / base, false);
    }
}
