// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol';

import './SGLCommon.sol';
import './SGLLendingBorrowing.sol';

// solhint-disable max-line-length

contract SGLLeverage is SGLLendingBorrowing {
    using RebaseLibrary for Rebase;
    // using BoringERC20 for IERC20;

    // From SGLStorage: COLLATERIZATION_RATE (sic); currently 1e5

    uint256 internal constant BPS = 10_000;

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param minAmountOut Mininal proceeds required for the sale
    /// @param swapper Swapper to execute the sale
    /// @param dexData Additional data to pass to the swapper
    /// @param amountOut Actual asset amount received in the sale
    function sellCollateral(
        address from,
        uint256 share,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    )
        external
        notPaused
        solvent(from)
        allowed(from)
        returns (uint256 amountOut)
    {
        require(penrose.swappers(swapper), 'SGL: Invalid swapper');

        updateExchangeRate();
        accrue();

        _removeCollateral(from, address(swapper), share);
        uint256 shareOut;
        (amountOut, shareOut) = swapper.swap(
            collateralId,
            assetId,
            share,
            address(this),
            minAmountOut,
            dexData
        );
        uint256 partOwed = userBorrowPart[from];
        uint256 amountOwed = totalBorrow.toElastic(partOwed, true);
        uint256 shareOwed = yieldBox.toShare(assetId, amountOwed, true);
        if (shareOwed <= shareOut) {
            // Skim the repayment; the swapper left it in the YB
            _repay(from, from, true, partOwed);
            yieldBox.transfer(
                address(this),
                from,
                assetId,
                shareOut - shareOwed
            );
        } else {
            // Repay as much as we can.
            // TODO: Is this guaranteed to succeed? Fair amount of conversions..
            uint256 partOut = totalBorrow.toBase(amountOut, false);
            _repay(from, from, true, partOut);
        }
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param minAmountOut Mininal collateral amount to receive
    /// @param swapper Swapper to execute the purchase
    /// @param dexData Additional data to pass to the swapper
    /// @param amountOut Actual collateral amount purchased
    function buyCollateral(
        address from,
        uint256 borrowAmount,
        uint256 supplyAmount,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    )
        external
        notPaused
        solvent(from)
        allowed(from)
        returns (uint256 amountOut)
    {
        require(penrose.swappers(swapper), 'SGL: Invalid swapper');

        // Let this fail first to save gas:
        uint256 supplyShare = yieldBox.toShare(assetId, supplyAmount, true);
        if (supplyShare > 0) {
            yieldBox.transfer(from, address(swapper), assetId, supplyShare);
        }

        updateExchangeRate();
        accrue();

        uint256 borrowShare;
        (, borrowShare) = _borrow(from, address(swapper), borrowAmount);

        uint256 collateralShare;
        (amountOut, collateralShare) = swapper.swap(
            assetId,
            collateralId,
            supplyShare + borrowShare,
            address(this),
            minAmountOut,
            dexData
        );
        _addCollateral(from, from, true, collateralShare);
    }
}
