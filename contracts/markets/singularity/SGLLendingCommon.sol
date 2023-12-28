// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLCommon.sol";

contract SGLLendingCommon is SGLCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    using SafeCast for uint256;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error BorrowCapReached();
    error NothingToRepay();
    error AllowanceNotValid();

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev Concrete implementation of `addCollateral`.
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
        uint256 oldTotalCollateralShare = totalCollateralShare;
        userCollateralShare[to] += share;
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
    }

    /// @dev Concrete implementation of `borrow`.
    function _borrow(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 part, uint256 share) {
        share = yieldBox.toShare(assetId, amount, false);
        Rebase memory _totalAsset = totalAsset;
        if (_totalAsset.base < 1000) revert MinLimit();
        _totalAsset.elastic -= share.toUint128();
        totalAsset = _totalAsset;

        uint256 feeAmount = (amount * borrowOpeningFee) / FEE_PRECISION; // A flat % fee is charged for any borrow

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);

        uint256 fullAssetAmount = yieldBox.toAmount(
            assetId,
            totalAsset.elastic,
            false
        ) + totalBorrow.elastic;

        uint256 feeFraction = (feeAmount * totalAsset.base) /
            (fullAssetAmount - feeAmount);
        accrueInfo.feesEarnedFraction += uint128(feeFraction);
        totalAsset.base = totalAsset.base + uint128(feeFraction);

        if (totalBorrowCap != 0) {
            if (totalBorrow.elastic > totalBorrowCap) revert BorrowCapReached();
        }
        userBorrowPart[from] += part;
        emit LogBorrow(from, to, amount, feeAmount, part);

        if (feeAmount > 0) {
            balanceOf[address(penrose)] += feeAmount;
        }

        yieldBox.transfer(address(this), to, assetId, share);
    }

    /// @dev Concrete implementation of `repay`.
    function _repay(
        address from,
        address to,
        bool skim,
        uint256 part
    ) internal returns (uint256 amount) {
        if (part > userBorrowPart[to]) {
            part = userBorrowPart[to];
        }
        if (part == 0) revert NothingToRepay();

        uint256 partInAmount;
        Rebase memory _totalBorrow = totalBorrow;
        (_totalBorrow, partInAmount) = _totalBorrow.sub(part, true);

        uint256 allowanceShare = _computeAllowanceAmountInAsset(
            to,
            exchangeRate,
            partInAmount,
            _safeDecimals(asset)
        );
        if (allowanceShare == 0) revert AllowanceNotValid();
        _allowedBorrow(from, allowanceShare);

        (totalBorrow, amount) = totalBorrow.sub(part, true);

        userBorrowPart[to] -= part;

        uint256 share = yieldBox.toShare(assetId, amount, true);
        uint128 totalShare = totalAsset.elastic;
        _addTokens(from, to, assetId, share, uint256(totalShare), skim);
        totalAsset.elastic = totalShare + share.toUint128();

        emit LogRepay(skim ? address(yieldBox) : from, to, amount, part);
    }

    function _safeDecimals(IERC20 token) internal view returns (uint8) {
        (bool success, bytes memory data) = address(token).staticcall(
            abi.encodeWithSelector(0x313ce567)
        ); //decimals() selector
        return success && data.length == 32 ? abi.decode(data, (uint8)) : 18;
    }
}
