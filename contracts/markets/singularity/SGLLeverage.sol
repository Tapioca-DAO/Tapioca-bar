// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20, IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// Tapioca
import {SafeApprove} from "../../libraries/SafeApprove.sol";
import {SGLLendingCommon} from "./SGLLendingCommon.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGLLeverage is SGLLendingCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error LeverageExecutorNotValid();
    error CollateralShareNotValid();

    struct _BuyCollateralCalldata {
        address from;
        uint256 borrowAmount;
        uint256 supplyAmount;
        bytes data;
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param data LeverageExecutor data
    /// @return amountOut Actual collateral amount purchased
    function buyCollateral(address from, uint256 borrowAmount, uint256 supplyAmount, bytes calldata data)
        external
        optionNotPaused(PauseType.LeverageBuy)
        solvent(from, false)
        notSelf(from)
        returns (uint256 amountOut)
    {
        if (address(leverageExecutor) == address(0)) {
            revert LeverageExecutorNotValid();
        }
        // Stack too deep fix
        _BuyCollateralCalldata memory calldata_;
        {
            calldata_.from = from;
            calldata_.borrowAmount = borrowAmount;
            calldata_.supplyAmount = supplyAmount;
            calldata_.data = data;
        }

        // Let this fail first to save gas:
        uint256 supplyShare = yieldBox.toShare(assetId, calldata_.supplyAmount, true);
        uint256 supplyShareToAmount;
        if (supplyShare > 0) {
            (supplyShareToAmount,) =
                yieldBox.withdraw(assetId, calldata_.from, address(leverageExecutor), 0, supplyShare);
        }
        (, uint256 borrowShare) = _borrow(calldata_.from, address(this), calldata_.borrowAmount);

        (uint256 borrowShareToAmount,) =
            yieldBox.withdraw(assetId, address(this), address(leverageExecutor), 0, borrowShare);
        amountOut = leverageExecutor.getCollateral(
            collateralId,
            address(asset),
            address(collateral),
            supplyShareToAmount + borrowShareToAmount,
            calldata_.from,
            calldata_.data
        );
        uint256 collateralShare = yieldBox.toShare(collateralId, amountOut, false);
        if (collateralShare == 0) revert CollateralShareNotValid();
        address(asset).safeApprove(address(yieldBox), type(uint256).max);
        yieldBox.depositAsset(collateralId, address(this), address(this), 0, collateralShare); // TODO Check for rounding attack?
        address(asset).safeApprove(address(yieldBox), 0);

        _allowedBorrow(calldata_.from, collateralShare);
        _addCollateral(calldata_.from, calldata_.from, false, 0, collateralShare);
    }

    struct _SellCollateralCalldata {
        address from;
        uint256 share;
        bytes data;
    }

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param data LeverageExecutor data
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(address from, uint256 share, bytes calldata data)
        external
        optionNotPaused(PauseType.LeverageSell)
        solvent(from, false)
        notSelf(from)
        returns (uint256 amountOut)
    {
        if (address(leverageExecutor) == address(0)) {
            revert LeverageExecutorNotValid();
        }
        // Stack too deep fix
        _SellCollateralCalldata memory calldata_;
        {
            calldata_.from = from;
            calldata_.share = share;
            calldata_.data = data;
        }

        _allowedBorrow(calldata_.from, calldata_.share);
        _removeCollateral(calldata_.from, address(this), calldata_.share);

        yieldBox.withdraw(collateralId, address(this), address(leverageExecutor), 0, calldata_.share);
        uint256 leverageAmount = yieldBox.toAmount(collateralId, calldata_.share, false);
        amountOut = leverageExecutor.getAsset(
            assetId, address(collateral), address(asset), leverageAmount, calldata_.from, calldata_.data
        );
        uint256 shareOut = yieldBox.toShare(assetId, amountOut, false);

        address(asset).safeApprove(address(yieldBox), type(uint256).max);
        yieldBox.depositAsset(assetId, address(this), address(this), 0, shareOut);
        address(asset).safeApprove(address(yieldBox), 0);

        uint256 partOwed = userBorrowPart[calldata_.from];
        uint256 amountOwed = totalBorrow.toElastic(partOwed, true);
        uint256 shareOwed = yieldBox.toShare(assetId, amountOwed, true);
        if (shareOwed <= shareOut) {
            _repay(calldata_.from, calldata_.from, false, partOwed);
        } else {
            //repay as much as we can
            uint256 partOut = totalBorrow.toBase(amountOut, false);
            _repay(calldata_.from, calldata_.from, false, partOut);
        }
    }
}
