// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BBCommon.sol";

// solhint-disable max-line-length

contract BBLiquidation is BBCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    function liquidateBadDebt(
        address user,
        address receiver,
        ISwapper swapper,
        bytes calldata collateralToAssetSwapData
    ) external onlyOwner {
        // Oracle can fail but we still need to allow liquidations
        updateExchangeRate();
        require(exchangeRate > 0, "BigBang: exchangeRate not valid");

        _accrue();

        // Closed liquidation using a pre-approved swapper
        require(
            penrose.swappers(penrose.hostLzChainId(), swapper),
            "BigBang: Invalid swapper"
        );

        uint256 borrowAmountWithBonus = userBorrowPart[user] +
            (userBorrowPart[user] * liquidationMultiplier) /
            FEE_PRECISION;
        uint256 requiredCollateral = yieldBox.toShare(
            collateralId,
            (borrowAmountWithBonus * exchangeRate) / EXCHANGE_RATE_PRECISION,
            false
        );

        // equality is included in the require to minimize risk and liquidate as soon as possible
        require(
            requiredCollateral >= userCollateralShare[user],
            "BigBang: Cannot force liquidated"
        );

        uint256 collateralShare = userCollateralShare[user];

        // everything will be liquidated; set borrow part and collateral share to 0
        uint256 borrowAmount;
        (totalBorrow, borrowAmount) = totalBorrow.sub(
            userBorrowPart[user],
            true
        );
        userBorrowPart[user] = 0;

        totalCollateralShare -= userCollateralShare[user];
        userCollateralShare[user] = 0;

        _swapCollateralWithAsset(
            collateralShare,
            receiver,
            address(swapper),
            collateralToAssetSwapData
        );
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Entry point for liquidations.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    /// @param collateralToAssetSwapData Extra swap data
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        ISwapper swapper,
        bytes calldata collateralToAssetSwapData
    ) external notPaused {
        require(
            users.length == maxBorrowParts.length,
            "BigBang: length mismatch"
        );
        // Oracle can fail but we still need to allow liquidations
        (, uint256 _exchangeRate) = updateExchangeRate();
        _accrue();

        _closedLiquidation(
            users,
            maxBorrowParts,
            swapper,
            _exchangeRate,
            collateralToAssetSwapData
        );
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _swapCollateralWithAsset(
        uint256 _collateralShare,
        address _receiver,
        address _swapper,
        bytes memory _dexData
    ) private returns (uint256 returnedShare) {
        // Swaps the users collateral for the borrowed asset
        yieldBox.transfer(
            address(this),
            address(_swapper),
            collateralId,
            _collateralShare
        );

        uint256 minAssetMount = 0;
        if (_dexData.length > 0) {
            minAssetMount = abi.decode(_dexData, (uint256));
        }

        uint256 balanceBefore = yieldBox.balanceOf(_receiver, assetId);

        ISwapper.SwapData memory swapData = ISwapper(_swapper).buildSwapData(
            collateralId,
            assetId,
            0,
            _collateralShare,
            true,
            true
        );
        ISwapper(_swapper).swap(swapData, minAssetMount, _receiver, "");
        uint256 balanceAfter = yieldBox.balanceOf(_receiver, assetId);

        returnedShare = balanceAfter - balanceBefore;
        require(returnedShare > 0, "BigBang: Swap failed");
    }

    function _updateBorrowAndCollateralShare(
        address user,
        uint256 maxBorrowPart,
        uint256 _exchangeRate
    )
        private
        returns (
            uint256 borrowAmount,
            uint256 borrowPart,
            uint256 collateralShare
        )
    {
        require(_exchangeRate > 0, "BigBang: exchangeRate not valid");
        uint256 collateralPartInAsset = (yieldBox.toAmount(
            collateralId,
            userCollateralShare[user],
            false
        ) * EXCHANGE_RATE_PRECISION) / _exchangeRate;

        uint256 availableBorrowPart = computeClosingFactor(
            userBorrowPart[user],
            collateralPartInAsset,
            FEE_PRECISION_DECIMALS
        );

        if (liquidationBonusAmount > 0) {
            availableBorrowPart =
                availableBorrowPart +
                (availableBorrowPart * liquidationBonusAmount) /
                FEE_PRECISION;
        }

        require(
            collateralPartInAsset > availableBorrowPart,
            "BigBang: bad debt"
        );

        borrowPart = maxBorrowPart > availableBorrowPart
            ? availableBorrowPart
            : maxBorrowPart;

        if (borrowPart > userBorrowPart[user]) {
            borrowPart = userBorrowPart[user];
        }

        userBorrowPart[user] = userBorrowPart[user] - borrowPart;

        borrowAmount = totalBorrow.toElastic(borrowPart, false);
        uint256 amountWithBonus = borrowAmount +
            (borrowAmount * liquidationMultiplier) /
            FEE_PRECISION;
        collateralShare = yieldBox.toShare(
            collateralId,
            (amountWithBonus * _exchangeRate) / EXCHANGE_RATE_PRECISION,
            false
        );
        if (collateralShare > userCollateralShare[user]) {
            collateralShare = userCollateralShare[user];
        }
        userCollateralShare[user] -= collateralShare;
        require(borrowAmount != 0, "SGL: solvent");

        totalBorrow.elastic -= uint128(borrowAmount);
        totalBorrow.base -= uint128(borrowPart);
    }

    function _extractLiquidationFees(
        uint256 returnedShare,
        uint256 borrowShare,
        uint256 callerReward
    ) private returns (uint256 feeShare, uint256 callerShare) {
        uint256 extraShare = returnedShare - borrowShare;
        feeShare = (extraShare * protocolFee) / FEE_PRECISION; // x% of profit goes to fee.
        callerShare = (extraShare * callerReward) / FEE_PRECISION; //  y%  of profit goes to caller.

        //protocol fees should be kept in the contract as we do a yieldBox.depositAsset when we are extracting the fees using `refreshPenroseFees`
        yieldBox.withdraw(assetId, address(this), address(this), 0, feeShare);
        yieldBox.transfer(address(this), msg.sender, assetId, callerShare);
    }

    function _liquidateUser(
        address user,
        uint256 maxBorrowPart,
        ISwapper swapper,
        uint256 _exchangeRate,
        bytes calldata _dexData
    ) private {
        if (_isSolvent(user, _exchangeRate)) return;

        // Closed liquidation using a pre-approved swapper
        require(
            penrose.swappers(penrose.hostLzChainId(), swapper),
            "BigBang: Invalid swapper"
        );

        uint256 callerReward = _getCallerReward(user, _exchangeRate);

        (
            uint256 borrowAmount,
            ,
            uint256 collateralShare
        ) = _updateBorrowAndCollateralShare(user, maxBorrowPart, _exchangeRate);

        uint256 borrowShare = yieldBox.toShare(assetId, borrowAmount, true);
        uint256 returnedShare = _swapCollateralWithAsset(
            collateralShare,
            address(this),
            address(swapper),
            _dexData
        );
        (uint256 feeShare, uint256 callerShare) = _extractLiquidationFees(
            returnedShare,
            borrowShare,
            callerReward
        );
        address[] memory _users = new address[](1);
        _users[0] = user;
        emit Liquidated(
            msg.sender,
            _users,
            callerShare,
            feeShare,
            borrowAmount,
            collateralShare
        );
    }

    /// @notice Handles the liquidation of users' balances, once the users' amount of collateral is too low.
    /// @dev Closed liquidations Only, 90% of extra shares goes to caller and 10% to protocol
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    /// @param swapData Swap necessary data
    function _closedLiquidation(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        ISwapper swapper,
        uint256 _exchangeRate,
        bytes calldata swapData
    ) private {
        uint256 liquidatedCount = 0;
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!_isSolvent(user, _exchangeRate)) {
                liquidatedCount++;
                _liquidateUser(
                    user,
                    maxBorrowParts[i],
                    swapper,
                    _exchangeRate,
                    swapData
                );
            }
        }

        require(liquidatedCount > 0, "BB: no users found");
    }
}
