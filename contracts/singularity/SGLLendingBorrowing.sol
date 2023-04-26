// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLCommon.sol";

contract SGLLendingBorrowing is SGLCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @param from Account to borrow for.
    /// @param to The receiver of borrowed tokens.
    /// @param amount Amount to borrow.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(
        address from,
        address to,
        uint256 amount
    ) public notPaused solvent(from) returns (uint256 part, uint256 share) {
        _allowedBorrow(from, userCollateralShare[from]);
        updateExchangeRate();

        accrue();
        (part, share) = _borrow(from, to, amount);
    }

    /// @notice Repays a loan.
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        address from,
        address to,
        bool skim,
        uint256 part
    ) public notPaused returns (uint256 amount) {
        updateExchangeRate();

        accrue();

        amount = _repay(from, to, skim, part);
    }

    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param from Account to transfer shares from.
    /// @param to The receiver of the tokens.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(
        address from,
        address to,
        bool skim,
        uint256 share
    ) public notPaused {
        _addCollateral(from, to, skim, share);
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(
        address from,
        address to,
        uint256 share
    ) public notPaused solvent(from) allowedBorrow(from, share) {
        // accrue must be called because we check solvency
        accrue();

        _removeCollateral(from, to, share);
    }

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
        allowedBorrow(from, share)
        returns (uint256 amountOut)
    {
        require(penrose.swappers(swapper), "SGL: Invalid swapper");

        // updateExchangeRate();
        // accrue();

        // _removeCollateral(from, address(swapper), share);

        // ISwapper.SwapData memory swapData = swapper.buildSwapData(
        //     collateralId,
        //     assetId,
        //     0,
        //     share,
        //     true,
        //     true
        // );

        // uint256 shareOut;
        // (amountOut, shareOut) = swapper.swap(
        //     swapData,
        //     minAmountOut,
        //     address(this),
        //     dexData
        // );

        // // As long as the ratio is correct, we trust `amountOut` resp.
        // // `shareOut`, because all money received by the swapper gets used up
        // // one way or another, or the transaction will revert.
        // require(amountOut >= minAmountOut, "SGL: not enough");

        // uint256 partOwed = userBorrowPart[from];
        // uint256 amountOwed = totalBorrow.toElastic(partOwed, true);
        // uint256 shareOwed = yieldBox.toShare(assetId, amountOwed, true);
        // if (shareOwed <= shareOut) {
        //     // Skim the repayment; the swapper left it in the YB
        //     _repay(from, from, true, partOwed);
        //     yieldBox.transfer(
        //         address(this),
        //         from,
        //         assetId,
        //         shareOut - shareOwed
        //     );
        // } else {
        //     // Repay as much as we can.
        //     // TODO: Is this guaranteed to succeed? Fair amount of conversions..
        //     uint256 partOut = totalBorrow.toBase(amountOut, false);
        //     _repay(from, from, true, partOut);
        // }
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
    ) external notPaused solvent(from) returns (uint256 amountOut) {
        require(penrose.swappers(swapper), "SGL: Invalid swapper");

        // Let this fail first to save gas:
        uint256 supplyShare = yieldBox.toShare(assetId, supplyAmount, true);
        _allowedLend(from, supplyShare);
        if (supplyShare > 0) {
            yieldBox.transfer(from, address(swapper), assetId, supplyShare);
        }

        updateExchangeRate();
        accrue();

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
            address(this),
            dexData
        );
        require(amountOut >= minAmountOut, "SGL: not enough");

        _addCollateral(from, from, true, collateralShare);
    }

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev Concrete implementation of `addCollateral`.
    function _addCollateral(
        address from,
        address to,
        bool skim,
        uint256 share
    ) internal {
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        _addTokens(
            from,
            to,
            collateralId,
            share,
            oldTotalCollateralShare,
            skim
        );
        emit LogAddCollateral(skim ? address(yieldBox) : from, to, share);
    }

    /// @dev Concrete implementation of `removeCollateral`.
    function _removeCollateral(
        address from,
        address to,
        uint256 share
    ) internal {
        userCollateralShare[from] -= share;
        totalCollateralShare -= share;
        emit LogRemoveCollateral(from, to, share);
        yieldBox.transfer(address(this), to, collateralId, share);
        if (share > _yieldBoxShares[from][COLLATERAL_SIG]) {
            _yieldBoxShares[from][COLLATERAL_SIG] = 0; //accrues in time
        } else {
            _yieldBoxShares[from][COLLATERAL_SIG] -= share;
        }
    }

    /// @dev Concrete implementation of `borrow`.
    function _borrow(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 part, uint256 share) {
        uint256 feeAmount = (amount * borrowOpeningFee) / FEE_PRECISION; // A flat % fee is charged for any borrow

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);
        require(
            totalBorrowCap == 0 || totalBorrow.base <= totalBorrowCap,
            "SGL: borrow cap reached"
        );
        userBorrowPart[from] += part;
        emit LogBorrow(from, to, amount, feeAmount, part);

        share = yieldBox.toShare(assetId, amount, false);
        Rebase memory _totalAsset = totalAsset;
        require(_totalAsset.base >= 1000, "SGL: min limit");
        _totalAsset.elastic -= uint128(share);
        totalAsset = _totalAsset;

        yieldBox.transfer(address(this), to, assetId, share);
    }

    /// @dev Concrete implementation of `repay`.
    function _repay(
        address from,
        address to,
        bool skim,
        uint256 part
    ) internal returns (uint256 amount) {
        (totalBorrow, amount) = totalBorrow.sub(part, true);

        userBorrowPart[to] -= part;

        uint256 share = yieldBox.toShare(assetId, amount, true);
        uint128 totalShare = totalAsset.elastic;
        _addTokens(from, to, assetId, share, uint256(totalShare), skim);
        totalAsset.elastic = totalShare + uint128(share);
        emit LogRepay(skim ? address(yieldBox) : from, to, amount, part);
    }
}
