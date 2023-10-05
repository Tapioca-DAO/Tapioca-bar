// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BBCommon.sol";
import "tapioca-periph/contracts/interfaces/IMarketLiquidatorReceiver.sol";

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
        IMarketLiquidatorReceiver liquidatorReceiver,
        bytes calldata liquidatorReceiverData
    ) external onlyOwner {
        (bool updated, uint256 _exchangeRate) = oracle.get(oracleData);
        if (updated && _exchangeRate > 0) {
            exchangeRate = _exchangeRate; //update cached rate
        } else {
            _exchangeRate = exchangeRate; //use stored rate
        }
        require(_exchangeRate > 0, "BigBang: current exchangeRate not valid"); //validate stored rate

        _accrue();

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
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas
    ) external optionNotPaused(PauseType.Liquidation) {
        require(users.length > 0, "BB: nothing to liquidate");
        require(users.length == maxBorrowParts.length, "BB: length mismatch");
        require(
            users.length == liquidatorReceivers.length,
            "BigBang: length mismatch"
        );
        require(
            liquidatorReceiverDatas.length == liquidatorReceivers.length,
            "BigBang: length mismatch"
        );

        // Oracle can fail but we still need to allow liquidations
        (bool updated, uint256 _exchangeRate) = oracle.get(oracleData);
        if (updated && _exchangeRate > 0) {
            exchangeRate = _exchangeRate; //update cached rate
        } else {
            _exchangeRate = exchangeRate; //use stored rate
        }

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
        require(returnedAmount > 0, "BigBang: onCollateralReceiver failed");
        returnedShare = yieldBox.toShare(assetId, returnedAmount, false);
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

        require(
            collateralPartInAsset > borrowPartWithBonus,
            "BigBang: bad debt"
        );

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

        require(
            collateralShare <= userCollateralShare[user],
            "BB: not enough collateral"
        );
        userCollateralShare[user] -= collateralShare;
        require(borrowAmount != 0, "BB: solvent");

        totalBorrow.elastic -= uint128(borrowAmount);
        totalBorrow.base -= uint128(borrowPart);
    }

    function _extractLiquidationFees(
        uint256 returnedShare,
        uint256 borrowShare,
        uint256 callerReward
    ) private returns (uint256 feeShare, uint256 callerShare) {
        feeShare = 0;
        callerShare = 0;
        uint256 extraShare = returnedShare - borrowShare;
        if (extraShare > 0) {
            feeShare = (extraShare * protocolFee) / FEE_PRECISION; // x% of profit goes to fee.
            callerShare = (extraShare * callerReward) / FEE_PRECISION; //  y%  of profit goes to caller.

            //protocol fees should be kept in the contract as we do a yieldBox.depositAsset when we are extracting the fees using `refreshPenroseFees`
            if (callerShare > 0) {
                asset.approve(address(yieldBox), 0);
                asset.approve(address(yieldBox), type(uint256).max);
                yieldBox.depositAsset(
                    assetId,
                    address(this),
                    msg.sender,
                    0,
                    callerShare
                );
            }
        }
        asset.approve(address(yieldBox), 0);
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
        totalCollateralShare = totalCollateralShare > collateralShare
            ? totalCollateralShare - collateralShare
            : 0;

        uint256 borrowShare = yieldBox.toShare(assetId, borrowAmount, true);

        (uint256 returnedShare, ) = _swapCollateralWithAsset(
            collateralShare,
            _liquidatorReceiver,
            _liquidatorReceiverData
        );
        require(
            returnedShare >= borrowShare,
            "BigBang: asset amount not valid"
        );

        (uint256 feeShare, uint256 callerShare) = _extractLiquidationFees(
            returnedShare,
            borrowShare,
            callerReward
        );

        IUSDOBase(address(asset)).burn(address(this), borrowAmount);

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
    function _closedLiquidation(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas,
        uint256 _exchangeRate
    ) private {
        uint256 liquidatedCount = 0;
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!_isSolvent(user, _exchangeRate)) {
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

        require(liquidatedCount > 0, "BB: no users found");
    }
}
