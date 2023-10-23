// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BBLendingCommon.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import {ITapiocaOFT} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";

contract BBLeverage is BBLendingCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param minAmountOut Minimal collateral amount to receive
    /// @param swapper Swapper to execute the purchase
    /// @param dexData Additional data to pass to the swapper
    /// @return amountOut Actual collateral amount purchased
    function buyCollateral(
        address from,
        uint256 borrowAmount,
        uint256 supplyAmount,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    )
        external
        optionNotPaused(PauseType.LeverageBuy)
        solvent(from, false)
        notSelf(from)
        returns (uint256 amountOut)
    {
        require(
            _isWhitelisted(penrose.hostLzChainId(), address(swapper)),
            "BigBang: Invalid swapper"
        );
        // Let this fail first to save gas:
        uint256 supplyShare = yieldBox.toShare(assetId, supplyAmount, true);
        if (supplyShare > 0) {
            yieldBox.transfer(from, address(swapper), assetId, supplyShare);
        }
        amountOut = _buyCollateralBorrowSwapAndAddCollateral(
            from,
            swapper,
            minAmountOut,
            dexData,
            borrowAmount,
            supplyShare
        );
    }

    function _buyCollateralBorrowSwapAndAddCollateral(
        address from,
        ISwapper swapper,
        uint256 minAmountOut,
        bytes calldata dexData,
        uint256 borrowAmount,
        uint256 supplyShare
    ) private returns (uint256 amountOut) {
        uint256 borrowShare;

        uint256 borrowFeeAmount = _computeVariableOpeningFee(borrowAmount);
        (, borrowShare) = _borrow(
            from,
            address(swapper),
            borrowAmount,
            borrowFeeAmount
        );
        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            assetId,
            collateralId,
            0,
            supplyShare + borrowShare,
            true,
            true
        );
        uint256 collateralShare;
        (amountOut, collateralShare) = swapper.swap(
            swapData,
            minAmountOut,
            from,
            dexData
        );
        require(amountOut >= minAmountOut, "BigBang: not enough");
        _allowedBorrow(from, collateralShare);
        _addCollateral(from, from, false, 0, collateralShare);
    }

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param minAmountOut Minimal proceeds required for the sale
    /// @param swapper Swapper to execute the sale
    /// @param dexData Additional data to pass to the swapper
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(
        address from,
        uint256 share,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    )
        external
        optionNotPaused(PauseType.LeverageSell)
        solvent(from, false)
        notSelf(from)
        returns (uint256 amountOut)
    {
        require(
            _isWhitelisted(penrose.hostLzChainId(), address(swapper)),
            "BigBang: Invalid swapper"
        );
        _allowedBorrow(from, share);
        _removeCollateral(from, address(swapper), share);
        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            collateralId,
            assetId,
            0,
            share,
            true,
            true
        );
        uint256 shareOut;
        (amountOut, shareOut) = swapper.swap(
            swapData,
            minAmountOut,
            from,
            dexData
        );
        // As long as the ratio is correct, we trust `amountOut` resp.
        // `shareOut`, because all money received by the swapper gets used up
        // one way or another, or the transaction will revert.
        require(amountOut >= minAmountOut, "BigBang: not enough");
        uint256 partOwed = userBorrowPart[from];
        uint256 amountOwed = totalBorrow.toElastic(partOwed, true);
        uint256 shareOwed = yieldBox.toShare(assetId, amountOwed, true);
        if (shareOwed <= shareOut) {
            _repay(from, from, partOwed);
        } else {
            //repay as much as we can
            uint256 partOut = totalBorrow.toBase(amountOut, false);
            _repay(from, from, partOut);
        }
    }
}
