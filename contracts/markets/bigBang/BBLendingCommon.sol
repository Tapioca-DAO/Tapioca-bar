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
        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);

        if (totalBorrowCap > 0) {
            if (totalBorrow.elastic > totalBorrowCap) revert BorrowCapReached();
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

        if (_exchangeRate >= minMintFeeStart)
            return (amount * minMintFee) / FEE_PRECISION;
        if (_exchangeRate <= maxMintFeeStart)
            return (amount * maxMintFee) / FEE_PRECISION;

        uint256 fee = maxMintFee -
            (((_exchangeRate - maxMintFeeStart) * (maxMintFee - minMintFee)) /
                (minMintFeeStart - maxMintFeeStart));

        if (fee > maxMintFee) return (amount * maxMintFee) / FEE_PRECISION;
        if (fee < minMintFee) return (amount * minMintFee) / FEE_PRECISION;

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

        uint256 amount;
        (totalBorrow, amount) = totalBorrow.sub(part, true);
        userBorrowPart[to] -= part;

        // amount includes the opening & accrued fees
        amountOut = amount;
        yieldBox.withdraw(assetId, from, address(this), amount, 0);

        //burn USDO
        IUSDOBase(address(asset)).burn(address(this), amount);

        emit LogRepay(from, to, amountOut, part);
    }
}
