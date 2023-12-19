// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLCommon.sol";
import "tapioca-periph/contracts/interfaces/IMarketLiquidatorReceiver.sol";

// solhint-disable max-line-length

contract SGLLiquidation is SGLCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error AmountNotValid();
    error ExchangeRateNotValid();
    error ForbiddenAction();
    error NothingToLiquidate();
    error LengthMismatch();
    error OnCollateralReceiverFailed();
    error BadDebt();
    error NotEnoughCollateral();
    error Solvent();

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    function liquidateBadDebt(
        address user,
        address receiver,
        IMarketLiquidatorReceiver liquidatorReceiver,
        bytes calldata liquidatorReceiverData
    ) external onlyOwner {
        (bool updated, uint256 _exchangeRate) = oracle.get(oracleData);
        if (updated && _exchangeRate > 0) {
            exchangeRate = _exchangeRate; //update cached rate
        } else {
            _exchangeRate = exchangeRate; //use stored rate
        }
        if (_exchangeRate == 0) revert ExchangeRateNotValid();

        _accrue();

        uint256 _userBorrowPart = userBorrowPart[user];

        uint256 borrowAmountWithBonus = _userBorrowPart +
            (_userBorrowPart * liquidationMultiplier) /
            FEE_PRECISION;
        uint256 requiredCollateral = yieldBox.toShare(
            collateralId,
            (borrowAmountWithBonus * exchangeRate) / EXCHANGE_RATE_PRECISION,
            false
        );

        // equality is included in the require to minimize risk and liquidate as soon as possible
        if (requiredCollateral < userCollateralShare[user])
            revert ForbiddenAction();

        uint256 collateralShare = userCollateralShare[user];

        // everything will be liquidated; set borrow part and collateral share to 0
        uint256 borrowAmount;
        (totalBorrow, borrowAmount) = totalBorrow.sub(_userBorrowPart, true);
        userBorrowPart[user] = 0;
        _yieldBoxShares[user][ASSET_SIG] = 0;

        totalCollateralShare -= userCollateralShare[user];
        userCollateralShare[user] = 0;
        _yieldBoxShares[user][COLLATERAL_SIG] = 0;

        (, uint256 returnedAmount) = _swapCollateralWithAsset(
            collateralShare,
            liquidatorReceiver,
            liquidatorReceiverData
        );

        asset.safeTransfer(receiver, returnedAmount);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Entry point for liquidations.
    /// @dev Will call `closedLiquidation()` if not LQ exists or no LQ bid avail exists. Otherwise use LQ.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas
    ) external optionNotPaused(PauseType.Liquidation) {
        if (users.length == 0) revert NothingToLiquidate();
        if (users.length != maxBorrowParts.length) revert LengthMismatch();
        if (users.length != liquidatorReceivers.length) revert LengthMismatch();
        if (liquidatorReceiverDatas.length != liquidatorReceivers.length)
            revert LengthMismatch();

        // Oracle can fail but we still need to allow liquidations
        (bool updated, uint256 _exchangeRate) = oracle.get(oracleData);
        if (updated && _exchangeRate > 0) {
            exchangeRate = _exchangeRate; //update cached rate
        } else {
            _exchangeRate = exchangeRate; //use stored rate
        }
        if (_exchangeRate == 0) revert ExchangeRateNotValid();

        _accrue();

        _closedLiquidation(
            users,
            maxBorrowParts,
            liquidatorReceivers,
            liquidatorReceiverDatas,
            _exchangeRate
        );
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _swapCollateralWithAsset(
        uint256 _collateralShare,
        IMarketLiquidatorReceiver _liquidatorReceiver,
        bytes memory _liquidatorReceiverData
    ) private returns (uint256 returnedShare, uint256 returnedAmount) {
        uint256 collateralAmount = yieldBox.toAmount(
            collateralId,
            _collateralShare,
            false
        );
        yieldBox.withdraw(
            collateralId,
            address(this),
            address(_liquidatorReceiver),
            collateralAmount,
            0
        );

        uint256 assetBalanceBefore = asset.balanceOf(address(this));
        //msg.sender should be validated against `initiator` on IMarketLiquidatorReceiver
        _liquidatorReceiver.onCollateralReceiver(
            msg.sender,
            address(collateral),
            address(asset),
            collateralAmount,
            _liquidatorReceiverData
        );
        uint256 assetBalanceAfter = asset.balanceOf(address(this));

        returnedAmount = assetBalanceAfter - assetBalanceBefore;
        if (returnedAmount == 0) revert OnCollateralReceiverFailed();
        returnedShare = yieldBox.toShare(assetId, returnedAmount, false);
    }

    function _computeAssetAmountToSolvency(
        address user,
        uint256 _exchangeRate
    ) private view returns (uint256) {
        // accrue must have already been called!
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return 0;

        if (_exchangeRate == 0) revert ExchangeRateNotValid();

        Rebase memory _totalBorrow = totalBorrow;

        uint256 collateralAmountInAsset = yieldBox.toAmount(
            collateralId,
            (userCollateralShare[user] *
                (EXCHANGE_RATE_PRECISION / FEE_PRECISION) *
                lqCollateralizationRate),
            false
        ) / _exchangeRate;
        // Obviously it's not `borrowPart` anymore but `borrowAmount`
        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        return
            borrowPart >= collateralAmountInAsset
                ? borrowPart - collateralAmountInAsset
                : 0;
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
        if (_exchangeRate == 0) revert ExchangeRateNotValid();
        uint256 collateralPartInAsset = (yieldBox.toAmount(
            collateralId,
            userCollateralShare[user],
            false
        ) * EXCHANGE_RATE_PRECISION) / _exchangeRate;

        uint256 borrowPartWithBonus = computeClosingFactor(
            userBorrowPart[user],
            collateralPartInAsset,
            FEE_PRECISION_DECIMALS
        );
        borrowPart = borrowPartWithBonus;

        if (liquidationBonusAmount > 0) {
            borrowPartWithBonus =
                borrowPartWithBonus +
                (borrowPartWithBonus * liquidationBonusAmount) /
                FEE_PRECISION;
        }
        borrowPartWithBonus = maxBorrowPart > borrowPartWithBonus
            ? borrowPartWithBonus
            : maxBorrowPart;
        borrowPartWithBonus = borrowPartWithBonus > userBorrowPart[user]
            ? userBorrowPart[user]
            : borrowPartWithBonus;

        if (collateralPartInAsset <= borrowPartWithBonus) revert BadDebt();

        borrowPart = maxBorrowPart > borrowPart ? borrowPart : maxBorrowPart;
        borrowPart = borrowPart > userBorrowPart[user]
            ? userBorrowPart[user]
            : borrowPart;

        userBorrowPart[user] = userBorrowPart[user] - borrowPart;

        borrowAmount = totalBorrow.toElastic(borrowPart, false);

        collateralShare = yieldBox.toShare(
            collateralId,
            (borrowPartWithBonus * _exchangeRate) / EXCHANGE_RATE_PRECISION,
            false
        );

        if (collateralShare > userCollateralShare[user])
            revert NotEnoughCollateral();
        userCollateralShare[user] -= collateralShare;
        if (borrowAmount == 0) revert Solvent();

        totalBorrow.elastic -= uint128(borrowAmount);
        totalBorrow.base -= uint128(borrowPart);
    }

    function _extractLiquidationFees(
        uint256 borrowShare,
        uint256 callerReward
    ) private returns (uint256 feeShare, uint256 callerShare) {
        uint256 returnedShare = yieldBox.balanceOf(address(this), assetId) -
            uint256(totalAsset.elastic);
        uint256 extraShare = returnedShare > borrowShare
            ? returnedShare - borrowShare
            : 0;

        callerShare = (extraShare * callerReward) / FEE_PRECISION; //  y%  of profit goes to caller.
        feeShare = extraShare - callerShare; // rest goes to the fee

        if (feeShare > 0) {
            asset.approve(address(yieldBox), 0);
            asset.approve(address(yieldBox), type(uint256).max);
            yieldBox.depositAsset(
                assetId,
                address(this),
                address(penrose),
                0,
                feeShare
            );
        }
        if (callerShare > 0) {
            yieldBox.depositAsset(
                assetId,
                address(this),
                msg.sender,
                0,
                callerShare
            );
        }

        totalAsset.elastic += uint128(returnedShare - feeShare - callerShare);

        asset.approve(address(yieldBox), 0);

        emit LogAddAsset(
            address(this),
            address(this),
            returnedShare - feeShare - callerShare,
            0
        );
    }

    function _liquidateUser(
        address user,
        uint256 maxBorrowPart,
        IMarketLiquidatorReceiver _liquidatorReceiver,
        bytes calldata _liquidatorReceiverData,
        uint256 _exchangeRate
    ) private {
        uint256 callerReward = _getCallerReward(user, _exchangeRate);
        (
            uint256 borrowAmount,
            ,
            uint256 collateralShare
        ) = _updateBorrowAndCollateralShare(user, maxBorrowPart, _exchangeRate);
        uint256 borrowShare = yieldBox.toShare(assetId, borrowAmount, true);
        totalCollateralShare = totalCollateralShare > collateralShare
            ? totalCollateralShare - collateralShare
            : 0;
        if (collateralShare > _yieldBoxShares[user][COLLATERAL_SIG]) {
            _yieldBoxShares[user][COLLATERAL_SIG] = 0; //some assets accrue in time
        } else {
            _yieldBoxShares[user][COLLATERAL_SIG] -= collateralShare;
        }
        if (borrowShare > _yieldBoxShares[user][ASSET_SIG]) {
            _yieldBoxShares[user][ASSET_SIG] = 0; //some assets accrue in time
        } else {
            _yieldBoxShares[user][ASSET_SIG] -= borrowShare;
        }

        (uint256 returnedShare, ) = _swapCollateralWithAsset(
            collateralShare,
            _liquidatorReceiver,
            _liquidatorReceiverData
        );

        if (returnedShare < borrowShare) revert AmountNotValid();
        (uint256 feeShare, uint256 callerShare) = _extractLiquidationFees(
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

    function _closedLiquidation(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas,
        uint256 _exchangeRate
    ) private {
        uint256 liquidatedCount = 0;
        unchecked {
            for (uint256 i; i < users.length; i++) {
                address user = users[i];
                if (!_isSolvent(user, _exchangeRate, true)) {
                    liquidatedCount++;
                    _liquidateUser(
                        user,
                        maxBorrowParts[i],
                        liquidatorReceivers[i],
                        liquidatorReceiverDatas[i],
                        _exchangeRate
                    );
                }
            }
        }
        if (liquidatedCount == 0) revert NothingToLiquidate();
    }
}
