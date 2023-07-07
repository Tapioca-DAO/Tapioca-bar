// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLLendingCommon.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import {ITapiocaOFT} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";

contract SGLLeverage is SGLLendingCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    /// @notice Level up cross-chain: Borrow more and buy collateral with it.
    /// @param from The user who sells
    /// @param collateralAmount Extra collateral to be added
    /// @param borrowAmount Borrowed amount that will be swapped into collateral
    /// @param swapData Swap data used on destination chain for swapping USDO to the underlying TOFT token
    /// @param lzData LayerZero specific data
    /// @param externalData External contracts used for the cross chain operation
    function multiHopBuyCollateral(
        address from,
        uint256 collateralAmount,
        uint256 borrowAmount,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    ) external payable notPaused solvent(from) {
        require(
            penrose.swappers(ISwapper(externalData.swapper)),
            "SGL: Invalid swapper"
        );

        //add collateral
        uint256 collateralShare = yieldBox.toShare(
            collateralId,
            collateralAmount,
            false
        );
        _allowedBorrow(from, collateralShare);
        _addCollateral(from, from, false, 0, collateralShare);

        //borrow
        (, uint256 borrowShare) = _borrow(from, from, borrowAmount);

        //withdraw
        yieldBox.withdraw(assetId, from, address(this), 0, borrowShare);

        IUSDOBase(address(asset)).sendForLeverage{value: msg.value}(
            borrowAmount,
            from,
            lzData,
            swapData,
            externalData
        );
    }

    function multiHopSellCollateral(
        address from,
        uint256 amount,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    ) external payable notPaused solvent(from) {
        require(
            penrose.swappers(ISwapper(externalData.swapper)),
            "SGL: Invalid swapper"
        );

        uint256 share = yieldBox.toShare(collateralId, amount, false);
        _allowedBorrow(from, share);
        _removeCollateral(from, address(this), share);
        (uint256 amountOut, ) = yieldBox.withdraw(
            collateralId,
            address(this),
            address(this),
            0,
            share
        );

        //send for unwrap
        ITapiocaOFT(address(collateral)).sendForLeverage{value: msg.value}(
            amountOut,
            from,
            lzData,
            swapData,
            externalData
        );
    }

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param minAmountOut Mininal proceeds required for the sale
    /// @param swapper Swapper to execute the sale
    /// @param dexData Additional data to pass to the swapper
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(
        address from,
        uint256 share,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    ) external notPaused solvent(from) returns (uint256 amountOut) {
        require(penrose.swappers(swapper), "SGL: Invalid swapper");

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
        require(amountOut >= minAmountOut, "SGL: not enough");
        uint256 partOwed = userBorrowPart[from];
        uint256 amountOwed = totalBorrow.toElastic(partOwed, true);
        uint256 shareOwed = yieldBox.toShare(assetId, amountOwed, true);
        if (shareOwed <= shareOut) {
            _repay(from, from, false, partOwed);
        } else {
            //repay as much as we can
            uint256 partOut = totalBorrow.toBase(amountOut, false);
            _repay(from, from, false, partOut);
        }
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param minAmountOut Mininal collateral amount to receive
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
    ) external notPaused solvent(from) returns (uint256 amountOut) {
        require(penrose.swappers(swapper), "SGL: Invalid swapper");

        // Let this fail first to save gas:
        uint256 supplyShare = yieldBox.toShare(assetId, supplyAmount, true);
        if (supplyShare > 0) {
            yieldBox.transfer(from, address(swapper), assetId, supplyShare);
        }

        uint256 borrowShare;
        (, borrowShare) = _borrow(from, address(swapper), borrowAmount);

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
        require(amountOut >= minAmountOut, "SGL: not enough");

        _allowedBorrow(from, collateralShare);
        _addCollateral(from, from, false, 0, collateralShare);
    }
}
