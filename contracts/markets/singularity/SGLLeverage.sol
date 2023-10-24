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
        bool useAirdroppedFunds,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    )
        external
        payable
        optionNotPaused(PauseType.LeverageBuy)
        solvent(from, false)
        notSelf(from)
    {
        require(
            _isWhitelisted(lzData.lzDstChainId, externalData.swapper),
            "SGL: Invalid swapper"
        );
        //add collateral
        if (collateralAmount > 0) {
            uint256 collateralShare = yieldBox.toShare(
                collateralId,
                collateralAmount,
                false
            );
            _allowedBorrow(from, collateralShare);
            _addCollateral(from, from, false, 0, collateralShare, true);
        }
        //borrow
        uint256 feeAmount = (borrowAmount * borrowOpeningFee) / FEE_PRECISION;
        uint256 allowanceShare = _computeAllowanceAmountInAsset(
            from,
            exchangeRate,
            borrowAmount + feeAmount,
            asset.safeDecimals()
        );
        if (from != msg.sender) {
            require(allowanceShare > 0, "BB: allowanceShare not valid");
        }
        _allowedBorrow(from, allowanceShare);
        (, uint256 borrowShare) = _borrow(from, from, borrowAmount);
        //withdraw
        (uint256 amountOut, ) = yieldBox.withdraw(
            assetId,
            from,
            address(this),
            0,
            borrowShare
        );
        IUSDOBase(address(asset)).sendForLeverage{
            value: useAirdroppedFunds ? address(this).balance : msg.value
        }(amountOut, from, lzData, swapData, externalData);
    }

    function multiHopSellCollateral(
        address from,
        uint256 amount,
        bool useAirdroppedFunds,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    )
        external
        payable
        optionNotPaused(PauseType.LeverageSell)
        solvent(from, false)
        notSelf(from)
    {
        require(
            _isWhitelisted(lzData.lzDstChainId, externalData.swapper),
            "SGL: Invalid swapper"
        );

        uint256 share = yieldBox.toShare(collateralId, amount, false);
        _allowedBorrow(from, share);
        _removeCollateral(from, address(this), share, true);
        (uint256 amountOut, ) = yieldBox.withdraw(
            collateralId,
            address(this),
            address(this),
            0,
            share
        );

        //send for unwrap
        ITapiocaOFT(address(collateral)).sendForLeverage{
            value: useAirdroppedFunds ? address(this).balance : msg.value
        }(amountOut, from, lzData, swapData, externalData);
    }

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
