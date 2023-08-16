// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BBCommon.sol";

contract BBLendingCommon is BBCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

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
        uint256 amount
    ) internal returns (uint256 part, uint256 share) {
        uint256 feeAmount = (amount * borrowOpeningFee) / FEE_PRECISION; // A flat % fee is charged for any borrow
        openingFees[to] += feeAmount;

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);
        require(
            totalBorrowCap == 0 || totalBorrow.elastic <= totalBorrowCap,
            "BigBang: borrow cap reached"
        );

        userBorrowPart[from] += part;
        emit LogBorrow(from, to, amount, feeAmount, part);

        //mint USDO
        IUSDOBase(address(asset)).mint(address(this), amount);

        //deposit borrowed amount to user
        asset.approve(address(yieldBox), 0);
        asset.approve(address(yieldBox), amount);
        yieldBox.depositAsset(assetId, address(this), to, amount, 0);

        share = yieldBox.toShare(assetId, amount, false);
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
        require(part > 0, "SGL: nothing to repay");

        uint256 openingFee = _computeRepayFee(to, part);

        require(openingFee < part, "BB: repayment too low");
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
