// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BBCommon.sol";

contract BBLendingCommon is BBCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error BorrowCapReached();
    error OracleCallFailed();
    error NothingToRepay();
    error RepayAmountNotValid();

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _addCollateral(
        address from,
        address to,
        bool skim,
        uint256 amount,
        uint256 share
    ) internal {
        if (share == 0) {
            share = yieldBox.toShare(collateralId, amount, false);
        }
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        _addTokens(from, collateralId, share, oldTotalCollateralShare, skim);
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
    }

    /// @dev Concrete implementation of `borrow`.
    function _borrow(
        address from,
        address to,
        uint256 amount,
        uint256 feeAmount
    ) internal returns (uint256 part, uint256 share) {
        openingFees[to] += feeAmount;

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);
        require(
            totalBorrowCap == 0 || totalBorrow.elastic <= totalBorrowCap,
            "BB: borrow cap reached"
        );

        if (totalBorrowCap > 0) {
            if (totalBorrow.elastic > totalBorrowCap)
                revert BorrowCapReached();
        }

        userBorrowPart[from] += part;
        emit LogBorrow(from, to, amount, feeAmount, part);

        //mint USDO
        IUSDOBase(address(asset)).mint(address(this), amount);

        //deposit borrowed amount to user
        share = _depositAmountToYb(asset, to, assetId, amount);
    }

    function _computeVariableOpeningFee(
        uint256 amount
    ) internal returns (uint256) {
        if (amount == 0) return 0;

        //get asset <> USDC price ( USDO <> USDC )
        (bool updated, uint256 _exchangeRate) = assetOracle.get(oracleData);
        if (!updated) revert OracleCallFailed();

        if (_exchangeRate >= minMintFeeStart) return minMintFee;
        if (_exchangeRate <= maxMintFeeStart) return maxMintFee;

        uint256 fee = maxMintFee -
            (((_exchangeRate - maxMintFeeStart) * (maxMintFee - minMintFee)) /
                (minMintFeeStart - maxMintFeeStart));

        if (fee > maxMintFee) return maxMintFee;
        if (fee < minMintFee) return minMintFee;

        if (fee > 0) {
            return (amount * fee) / FEE_PRECISION;
        }
        return 0;
    }

    /// @dev Concrete implementation of `repay`.
    function _repay(
        address from,
        address to,
        uint256 part
    ) internal returns (uint256 amountOut) {
        if (part > userBorrowPart[to]) {
            part = userBorrowPart[to];
        }
        if (part == 0) revert NothingToRepay();

        uint256 openingFee = _computeRepayFee(to, part);
        if (openingFee >= part) revert RepayAmountNotValid();

        openingFees[to] -= openingFee;

        uint256 amount;
        (totalBorrow, amount) = totalBorrow.sub(part, true);
        userBorrowPart[to] -= part;

        amountOut = amount;

        yieldBox.withdraw(assetId, from, address(this), amount, 0);

        uint256 accruedFees = amount - part;
        if (accruedFees > 0) {
            uint256 feeAmount = (accruedFees * protocolFee) / FEE_PRECISION;
            amount -= feeAmount;
        }
        uint256 toBurn = (amount - openingFee); //the opening & accrued fees remain in the contract
        //burn USDO
        if (toBurn > 0) {
            IUSDOBase(address(asset)).burn(address(this), toBurn);
        }

        emit LogRepay(from, to, amountOut, part);
    }

    function _computeRepayFee(
        address user,
        uint256 repayPart
    ) private view returns (uint256) {
        uint256 _totalPart = userBorrowPart[user];

        if (repayPart == _totalPart) {
            return openingFees[user];
        }

        uint256 _assetDecimals = asset.safeDecimals();
        uint256 repayRatio = _getRatio(repayPart, _totalPart, _assetDecimals);
        //it can return 0 when numerator is very low compared to the denominator
        if (repayRatio == 0) return 0;

        uint256 openingFee = (repayRatio * openingFees[user]) /
            (10 ** _assetDecimals);
        if (openingFee > openingFees[user]) return openingFees[user];

        return openingFee;
    }
}
