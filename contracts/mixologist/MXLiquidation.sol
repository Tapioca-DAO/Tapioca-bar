// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './MXCommon.sol';

// solhint-disable max-line-length

contract MXLiquidation is MXCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************** //
    // *** PUBLIC *** //
    // ************** //

    /// @notice Return the amount of collateral for a `user` to be solvent. Returns 0 if user already solvent.
    /// @dev We use a `CLOSED_COLLATERIZATION_RATE` that is a safety buffer when making the user solvent again,
    ///      To prevent from being liquidated. This function is valid only if user is not solvent by `_isSolvent()`.
    /// @param user The user to check solvency.
    /// @param _exchangeRate The exchange rate asset/collateral.
    /// @return The amount of collateral to be solvent.
    function computeAssetAmountToSolvency(address user, uint256 _exchangeRate)
        public
        view
        returns (uint256)
    {
        // accrue must have already been called!
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return 0;
        uint256 collateralShare = userCollateralShare[user];

        Rebase memory _totalBorrow = totalBorrow;

        uint256 collateralAmountInAsset = _getAmountForCollateralShares(
            collateralShare
        );
        // Obviously it's not `borrowPart` anymore but `borrowAmount`
        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        return
            borrowPart >= collateralAmountInAsset
                ? borrowPart - collateralAmountInAsset
                : 0;
    }

    /// @notice Entry point for liquidations.
    /// @dev Will call `closedLiquidation()` if not LQ exists or no LQ bid avail exists. Otherwise use LQ.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    ///        Ignore for `orderBookLiquidation()`
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    ///        Ignore for `orderBookLiquidation()`
    /// @param collateralToAssetSwapData Extra swap data
    ///        Ignore for `orderBookLiquidation()`
    /// @param usdoToBorrowedSwapData Extra swap data
    ///        Ignore for `closedLiquidation()`
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        MultiSwapper swapper,
        bytes calldata collateralToAssetSwapData,
        bytes calldata usdoToBorrowedSwapData
    ) external {
        // Oracle can fail but we still need to allow liquidations
        (, uint256 _exchangeRate) = updateExchangeRate();
        accrue();

        if (address(liquidationQueue) != address(0)) {
            (, bool bidAvail) = liquidationQueue.getNextAvailBidPool();
            if (bidAvail) {
                _orderBookLiquidation(
                    users,
                    _exchangeRate,
                    usdoToBorrowedSwapData
                );
                return;
            }
        }
        _closedLiquidation(
            users,
            maxBorrowParts,
            swapper,
            _exchangeRate,
            collateralToAssetSwapData
        );
    }

    // *************** //
    // *** PRIVATE *** //
    // *************** //
    function _orderBookLiquidation(
        address[] calldata users,
        uint256 _exchangeRate,
        bytes memory swapData
    ) private {
        uint256 allCollateralShare;
        uint256 allBorrowAmount;
        uint256 allBorrowPart;
        Rebase memory _totalBorrow = totalBorrow;

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!_isSolvent(user, _exchangeRate)) {
                uint256 borrowAmount = computeAssetAmountToSolvency(
                    user,
                    _exchangeRate
                );
                if (borrowAmount == 0) {
                    continue;
                }

                uint256 borrowPart;
                {
                    uint256 availableBorrowPart = userBorrowPart[user];
                    borrowPart = _totalBorrow.toBase(borrowAmount, false);
                    userBorrowPart[user] = availableBorrowPart - borrowPart;
                }
                uint256 collateralShare = yieldBox.toShare(
                    collateralId,
                    (borrowAmount * _exchangeRate * LIQUIDATION_MULTIPLIER) /
                        (EXCHANGE_RATE_PRECISION *
                            LIQUIDATION_MULTIPLIER_PRECISION),
                    false
                );
                userCollateralShare[user] -= collateralShare;
                emit LogRemoveCollateral(
                    user,
                    address(liquidationQueue),
                    collateralShare
                );
                emit LogRepay(
                    address(liquidationQueue),
                    user,
                    borrowAmount,
                    borrowPart
                );

                // Keep totals
                allCollateralShare += collateralShare;
                allBorrowAmount += borrowAmount;
                allBorrowPart += borrowPart;
            }
        }
        require(allBorrowAmount != 0, 'Mx: solvent');

        _totalBorrow.elastic -= uint128(allBorrowAmount);
        _totalBorrow.base -= uint128(allBorrowPart);
        totalBorrow = _totalBorrow;
        totalCollateralShare -= allCollateralShare;

        uint256 allBorrowShare = yieldBox.toShare(
            assetId,
            allBorrowAmount,
            true
        );

        // Transfer collateral to be liquidated
        yieldBox.transfer(
            address(this),
            address(liquidationQueue),
            collateralId,
            allCollateralShare
        );

        // LiquidationQueue pay debt
        liquidationQueue.executeBids(
            yieldBox.toAmount(collateralId, allCollateralShare, true),
            swapData
        );

        uint256 returnedShare = yieldBox.balanceOf(address(this), assetId) -
            uint256(totalAsset.elastic);
        uint256 extraShare = returnedShare - allBorrowShare;
        uint256 callerShare = (extraShare * CALLER_FEE) / CALLER_FEE_DIVISOR; // 1% goes to caller

        yieldBox.transfer(address(this), msg.sender, assetId, callerShare);

        totalAsset.elastic += uint128(returnedShare - callerShare);
        emit LogAddAsset(
            address(liquidationQueue),
            address(this),
            returnedShare - callerShare,
            0
        );
    }

    /// @notice Handles the liquidation of users' balances, once the users' amount of collateral is too low.
    /// @dev Closed liquidations Only, 90% of extra shares goes to caller and 10% to protocol
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    /// @param swapData Swap necessar data
    function _closedLiquidation(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        MultiSwapper swapper,
        uint256 _exchangeRate,
        bytes calldata swapData
    ) private {
        uint256 allCollateralShare;
        uint256 allBorrowAmount;
        uint256 allBorrowPart;
        Rebase memory _totalBorrow = totalBorrow;
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!_isSolvent(user, _exchangeRate)) {
                uint256 borrowPart;
                {
                    uint256 availableBorrowPart = userBorrowPart[user];
                    borrowPart = maxBorrowParts[i] > availableBorrowPart
                        ? availableBorrowPart
                        : maxBorrowParts[i];
                    userBorrowPart[user] = availableBorrowPart - borrowPart;
                }
                uint256 borrowAmount = _totalBorrow.toElastic(
                    borrowPart,
                    false
                );
                uint256 collateralShare = yieldBox.toShare(
                    collateralId,
                    (borrowAmount * LIQUIDATION_MULTIPLIER * _exchangeRate) /
                        (LIQUIDATION_MULTIPLIER_PRECISION *
                            EXCHANGE_RATE_PRECISION),
                    false
                );
                userCollateralShare[user] -= collateralShare;
                emit LogRemoveCollateral(
                    user,
                    address(swapper),
                    collateralShare
                );
                emit LogRepay(address(swapper), user, borrowAmount, borrowPart);

                // Keep totals
                allCollateralShare += collateralShare;
                allBorrowAmount += borrowAmount;
                allBorrowPart += borrowPart;
            }
        }
        require(allBorrowAmount != 0, 'Mx: solvent');
        _totalBorrow.elastic -= uint128(allBorrowAmount);
        _totalBorrow.base -= uint128(allBorrowPart);
        totalBorrow = _totalBorrow;
        totalCollateralShare -= allCollateralShare;

        uint256 allBorrowShare = yieldBox.toShare(
            assetId,
            allBorrowAmount,
            true
        );

        // Closed liquidation using a pre-approved swapper
        require(beachBar.swappers(swapper), 'Mx: Invalid swapper');

        // Swaps the users collateral for the borrowed asset
        yieldBox.transfer(
            address(this),
            address(swapper),
            collateralId,
            allCollateralShare
        );

        uint256 minAssetMount = 0;
        if (swapData.length > 0) {
            minAssetMount = abi.decode(swapData, (uint256));
        }
        swapper.swap(
            collateralId,
            assetId,
            minAssetMount,
            address(this),
            collateralSwapPath,
            allCollateralShare
        );

        uint256 returnedShare = yieldBox.balanceOf(address(this), assetId) -
            uint256(totalAsset.elastic);
        uint256 extraShare = returnedShare - allBorrowShare;
        uint256 feeShare = (extraShare * PROTOCOL_FEE) / PROTOCOL_FEE_DIVISOR; // 10% of profit goes to fee.
        uint256 callerShare = (extraShare * CALLER_FEE) / CALLER_FEE_DIVISOR; //  1%  of profit goes to caller.

        yieldBox.transfer(address(this), beachBar.feeTo(), assetId, feeShare);
        yieldBox.transfer(address(this), msg.sender, assetId, callerShare);

        totalAsset.elastic += uint128(returnedShare - feeShare - callerShare);
        emit LogAddAsset(
            address(swapper),
            address(this),
            extraShare - feeShare - callerShare,
            0
        );
    }
}
