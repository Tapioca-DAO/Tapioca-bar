// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20, IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";
import {SGLCommon} from "./SGLCommon.sol";

// solhint-disable max-line-length

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGLLiquidation is SGLCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    using SafeCast for uint256;
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error AmountNotValid();
    error ForbiddenAction();
    error NothingToLiquidate();
    error LengthMismatch();
    error OnCollateralReceiverFailed();
    error BadDebt();
    error NotEnoughCollateral();
    error Solvent();
    error InsufficientLiquidationBonus();
    error NotAuthorized();

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns the collateral amount used in a liquidation
    /// @dev useful to compute minAmountOut for collateral to asset swap
    function viewLiquidationCollateralAmount(_ViewLiquidationStruct memory _data)
        external
        view
        returns (uint256 collateralAmount)
    {
        (,, uint256 collateralShare) = _viewLiqudationBorrowAndCollateralShare(_data);

        collateralAmount = _data.yieldBox.toAmount(_data.collateralId, collateralShare, false);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    function liquidateBadDebt(
        address user,
        address from,
        address receiver,
        IMarketLiquidatorReceiver liquidatorReceiver,
        bytes calldata liquidatorReceiverData,
        bool swapCollateral
    ) external onlyOwner {
        _updateOracleRateForLiquidations();

        //check from whitelist status
        {
            bool isWhitelisted = ICluster(penrose.cluster()).isWhitelisted(0, from);
            if (!isWhitelisted) revert NotAuthorized();
        }
        // accrue before liquidation
        _accrue();

        // compute borrow amount with bonus
        uint256 elasticPart = totalBorrow.toElastic(userBorrowPart[user], false);
        uint256 borrowAmountWithBonus = elasticPart + (elasticPart * liquidationMultiplier) / FEE_PRECISION;
        uint256 requiredCollateral =
            yieldBox.toShare(collateralId, (borrowAmountWithBonus * exchangeRate) / EXCHANGE_RATE_PRECISION, false);

        uint256 collateralShare = userCollateralShare[user];
        if (requiredCollateral < collateralShare) revert ForbiddenAction();

        // update totalBorrow
        uint256 borrowAmount = totalBorrow.toElastic(userBorrowPart[user], true);
        totalBorrow.elastic -= borrowAmount.toUint128();
        totalBorrow.base -= userBorrowPart[user].toUint128();

        // update totalCollateralShare
        totalCollateralShare -= collateralShare;

        // set user share & part to 0
        userCollateralShare[user] = 0;
        userBorrowPart[user] = 0;

        // transfer asset from `from`
        asset.safeTransferFrom(from, address(this), borrowAmount);
        address(asset).safeApprove(address(yieldBox), borrowAmount);
        uint256 borrowShare = yieldBox.toShare(assetId, borrowAmount, false);
        yieldBox.depositAsset(assetId, address(this), address(this), borrowAmount, 0);
        totalAsset.elastic += borrowShare.toUint128();

        // swap collateral with asset and send it to `receiver`
        if (swapCollateral) {
            (, uint256 returnedAmount) =
                _swapCollateralWithAsset(collateralShare, liquidatorReceiver, liquidatorReceiverData);
            asset.safeTransfer(receiver, returnedAmount);
        } else {
            uint256 collateralAmount = yieldBox.toAmount(collateralId, collateralShare, false);
            yieldBox.withdraw(collateralId, address(this), receiver, collateralAmount, 0);
        }
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Entry point for liquidations.
    /// @dev Will call `closedLiquidation()` if not LQ exists or no LQ bid avail exists. Otherwise use LQ.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user
    /// @param minLiquidationBonuses minimum liquidation bonus acceptable
    /// @param liquidatorReceivers IMarketLiquidatorReceiver array
    /// @param liquidatorReceiverDatas IMarketLiquidatorReceiver datas
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        uint256[] calldata minLiquidationBonuses,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas
    ) external optionNotPaused(PauseType.Liquidation) nonReentrant {
        if (users.length == 0) revert NothingToLiquidate();
        if (users.length != maxBorrowParts.length) revert LengthMismatch();
        if (users.length != liquidatorReceivers.length) revert LengthMismatch();
        if (liquidatorReceiverDatas.length != liquidatorReceivers.length) {
            revert LengthMismatch();
        }

        _updateOracleRateForLiquidations();

        _accrue();

        _closedLiquidation(
            users, maxBorrowParts, minLiquidationBonuses, liquidatorReceivers, liquidatorReceiverDatas, exchangeRate
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
        uint256 collateralAmount = yieldBox.toAmount(collateralId, _collateralShare, false);
        yieldBox.withdraw(collateralId, address(this), address(_liquidatorReceiver), collateralAmount, 0);

        uint256 assetBalanceBefore = asset.balanceOf(address(this));
        //msg.sender should be validated against `initiator` on IMarketLiquidatorReceiver
        _liquidatorReceiver.onCollateralReceiver(
            msg.sender, address(collateral), address(asset), collateralAmount, _liquidatorReceiverData
        );
        uint256 assetBalanceAfter = asset.balanceOf(address(this));

        returnedAmount = assetBalanceAfter - assetBalanceBefore;
        if (returnedAmount == 0) revert OnCollateralReceiverFailed();
        returnedShare = yieldBox.toShare(assetId, returnedAmount, false);
    }

    function _computeAssetAmountToSolvency(address user, uint256 _exchangeRate) private view returns (uint256) {
        // accrue must have already been called!
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return 0;

        if (_exchangeRate == 0) revert ExchangeRateNotValid();

        Rebase memory _totalBorrow = totalBorrow;

        uint256 collateralAmountInAsset = yieldBox.toAmount(
            collateralId,
            (userCollateralShare[user] * (EXCHANGE_RATE_PRECISION / FEE_PRECISION) * lqCollateralizationRate),
            false
        ) / _exchangeRate;
        // Obviously it's not `borrowPart` anymore but `borrowAmount`
        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        return borrowPart >= collateralAmountInAsset ? borrowPart - collateralAmountInAsset : 0;
    }

    function _viewLiqudationBorrowAndCollateralShare(_ViewLiquidationStruct memory _data)
        private
        view
        returns (uint256 borrowAmount, uint256 borrowPart, uint256 collateralShare)
    {
        if (_data.exchangeRate == 0) revert ExchangeRateNotValid();

        // get collateral amount in asset's value
        uint256 collateralPartInAsset = (
            _data.yieldBox.toAmount(_data.collateralId, _data.userCollateralShare, false) * _data.exchangeRatePrecision
        ) / _data.exchangeRate;

        // compute closing factor (liquidatable amount)
        uint256 borrowPartWithBonus = _computeClosingFactor(
            _data.userBorrowPart,
            collateralPartInAsset,
            _data.feeDecimalsPrecision,
            _data.liquidationCollateralizationRate,
            _data.liquidationMultiplier,
            _data.totalBorrow
        );

        // limit liquidable amount before bonus to the current debt
        uint256 userTotalBorrowAmount = _data.totalBorrow.toElastic(_data.userBorrowPart, true);
        borrowPartWithBonus = borrowPartWithBonus > userTotalBorrowAmount ? userTotalBorrowAmount : borrowPartWithBonus;

        // check the amount to be repaid versus liquidator supplied limit
        borrowPartWithBonus = borrowPartWithBonus > _data.maxBorrowPart ? _data.maxBorrowPart : borrowPartWithBonus;
        borrowAmount = borrowPartWithBonus;

        // compute part units, preventing rounding dust when liquidation is full
        borrowPart = borrowAmount == userTotalBorrowAmount
            ? _data.userBorrowPart
            : _data.totalBorrow.toBase(borrowPartWithBonus, false);
        if (borrowPart == 0) revert Solvent();

        if (_data.liquidationBonusAmount > 0) {
            borrowPartWithBonus =
                borrowPartWithBonus + (borrowPartWithBonus * _data.liquidationBonusAmount) / FEE_PRECISION;
        }

        if (collateralPartInAsset < borrowPartWithBonus) {
            if (collateralPartInAsset <= userTotalBorrowAmount) {
                revert BadDebt();
            }
            // If current debt is covered by collateral fully
            // then there is some liquidation bonus,
            // so liquidation can proceed if liquidator's minimum is met
            if (_data.minLiquidationBonus > 0) {
                // `collateralPartInAsset > borrowAmount` as `borrowAmount <= userTotalBorrowAmount`
                uint256 effectiveBonus = ((collateralPartInAsset - borrowAmount) * FEE_PRECISION) / borrowAmount;
                if (effectiveBonus < _data.minLiquidationBonus) {
                    revert InsufficientLiquidationBonus();
                }
                collateralShare = _data.userCollateralShare;
            } else {
                revert InsufficientLiquidationBonus();
            }
        } else {
            collateralShare = _data.yieldBox.toShare(
                _data.collateralId, (borrowPartWithBonus * _data.exchangeRate) / _data.exchangeRatePrecision, false
            );
            if (collateralShare > _data.userCollateralShare) {
                revert NotEnoughCollateral();
            }
        }
    }

    function _updateBorrowAndCollateralShare(
        address user,
        uint256 maxBorrowPart,
        uint256 minLiquidationBonus, // min liquidation bonus to accept (default 0)
        uint256 _exchangeRate
    ) private returns (uint256 borrowAmount, uint256 borrowPart, uint256 collateralShare) {
        (borrowAmount, borrowPart, collateralShare) = _viewLiqudationBorrowAndCollateralShare(
            _ViewLiquidationStruct(
                user,
                maxBorrowPart,
                minLiquidationBonus,
                _exchangeRate,
                yieldBox,
                collateralId,
                userCollateralShare[user],
                userBorrowPart[user],
                totalBorrow,
                liquidationBonusAmount,
                liquidationCollateralizationRate,
                liquidationMultiplier,
                EXCHANGE_RATE_PRECISION,
                FEE_PRECISION_DECIMALS
            )
        );

        userBorrowPart[user] -= borrowPart;
        userCollateralShare[user] -= collateralShare;
    }

    function _extractLiquidationFees(uint256 extraShare, uint256 callerReward)
        private
        returns (uint256 feeShare, uint256 callerShare)
    {
        callerShare = (extraShare * callerReward) / FEE_PRECISION; //  y%  of profit goes to caller.
        feeShare = extraShare - callerShare; // rest goes to the fee

        if (feeShare > 0) {
            uint256 feeAmount = yieldBox.toAmount(assetId, feeShare, false);
            yieldBox.depositAsset(assetId, address(this), address(penrose), feeAmount, 0);
        }
        if (callerShare > 0) {
            uint256 callerAmount = yieldBox.toAmount(assetId, callerShare, false);
            yieldBox.depositAsset(assetId, address(this), msg.sender, callerAmount, 0);
        }
    }

    function _liquidateUser(
        address user,
        uint256 maxBorrowPart,
        IMarketLiquidatorReceiver _liquidatorReceiver,
        bytes calldata _liquidatorReceiverData,
        uint256 _exchangeRate,
        uint256 minLiquidationBonus
    ) private {
        uint256 callerReward = _getCallerReward(user, _exchangeRate);
        (uint256 borrowAmount,, uint256 collateralShare) =
            _updateBorrowAndCollateralShare(user, maxBorrowPart, minLiquidationBonus, _exchangeRate);
        uint256 borrowShare = yieldBox.toShare(assetId, borrowAmount, true);
        totalCollateralShare = totalCollateralShare > collateralShare ? totalCollateralShare - collateralShare : 0;

        (uint256 returnedShare,) =
            _swapCollateralWithAsset(collateralShare, _liquidatorReceiver, _liquidatorReceiverData);

        if (returnedShare < borrowShare) revert AmountNotValid();

        uint256 extraShare = returnedShare > borrowShare ? returnedShare - borrowShare : 0;

        address(asset).safeApprove(address(yieldBox), type(uint256).max);
        yieldBox.depositAsset(assetId, address(this), address(this), 0, returnedShare - extraShare);
        totalAsset.elastic += (returnedShare - extraShare).toUint128();
        emit LogAddAsset(address(this), address(this), (returnedShare - extraShare), 0);
        (uint256 feeShare, uint256 callerShare) = _extractLiquidationFees(extraShare, callerReward);
        address(asset).safeApprove(address(yieldBox), 0);
        address[] memory _users = new address[](1);
        _users[0] = user;
        emit Liquidated(msg.sender, _users, callerShare, feeShare, borrowAmount, collateralShare);
    }

    struct __ClosedLiquidationCalldata {
        address user;
        uint256 maxBorrowPart;
        uint256 minLiquidationBonus;
        IMarketLiquidatorReceiver liquidatorReceiver;
    }

    function _closedLiquidation(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        uint256[] calldata minLiquidationBonuses,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas,
        uint256 _exchangeRate
    ) private {
        uint256 liquidatedCount = 0;
        uint256 arrLength = users.length;

        __ClosedLiquidationCalldata memory calldata_; // Stack too deep fix

        for (uint256 i; i < arrLength;) {
            calldata_.user = users[i];
            calldata_.maxBorrowPart = maxBorrowParts[i];
            calldata_.minLiquidationBonus = minLiquidationBonuses[i];
            calldata_.liquidatorReceiver = liquidatorReceivers[i];

            if (!_isSolvent(calldata_.user, _exchangeRate, true)) {
                liquidatedCount++;
                _liquidateUser(
                    calldata_.user,
                    calldata_.maxBorrowPart,
                    calldata_.liquidatorReceiver,
                    liquidatorReceiverDatas[i],
                    _exchangeRate,
                    calldata_.minLiquidationBonus
                );
            }
            unchecked {
                ++i;
            }
        }

        require(liquidatedCount != 0, "BB: no users found");
    }
}
