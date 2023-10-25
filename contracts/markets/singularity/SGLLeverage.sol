// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLLendingCommon.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import {ITapiocaOFT} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";

contract SGLLeverage is SGLLendingCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param data LeverageExecutor data
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(
        address from,
        uint256 share,
        bytes calldata data
    )
        external
        optionNotPaused(PauseType.LeverageSell)
        solvent(from, false)
        notSelf(from)
        returns (uint256 amountOut)
    {
        require(
            address(leverageExecutor) != address(0),
            "BB: leverage executor not valid"
        );

        _allowedBorrow(from, share);
        _removeCollateral(from, leverageExecutor.swapper(), share, false);
        amountOut = leverageExecutor.getAsset(
            assetId,
            collateralId,
            share,
            from,
            data
        );
        uint256 shareOut = yieldBox.toShare(assetId, amountOut, false);

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
    /// @param data LeverageExecutor data
    /// @return amountOut Actual collateral amount purchased
    function buyCollateral(
        address from,
        uint256 borrowAmount,
        uint256 supplyAmount,
        bytes calldata data
    )
        external
        optionNotPaused(PauseType.LeverageBuy)
        solvent(from, false)
        notSelf(from)
        returns (uint256 amountOut)
    {
        require(
            address(leverageExecutor) != address(0),
            "BB: leverage executor not valid"
        );

        // Let this fail first to save gas:
        uint256 supplyShare = yieldBox.toShare(assetId, supplyAmount, true);
        if (supplyShare > 0) {
            yieldBox.transfer(
                from,
                leverageExecutor.swapper(),
                assetId,
                supplyShare
            );
        }

        (, uint256 borrowShare) = _borrow(
            from,
            leverageExecutor.swapper(),
            borrowAmount
        );

        amountOut = leverageExecutor.getCollateral(
            assetId,
            collateralId,
            supplyShare + borrowShare,
            from,
            data
        );
        uint256 collateralShare = yieldBox.toShare(
            collateralId,
            amountOut,
            false
        );

        _allowedBorrow(from, collateralShare);
        _addCollateral(from, from, false, 0, collateralShare, false);
    }
}
