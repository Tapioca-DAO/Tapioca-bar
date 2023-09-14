// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLCommon.sol";

contract SGLLendingCommon is SGLCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev Concrete implementation of `addCollateral`.
    function _addCollateral(
        address from,
        address to,
        bool skim,
        uint256 amount,
        uint256 share,
        bool multiHopLeverage
    ) internal {
        if (share == 0) {
            share = yieldBox.toShare(collateralId, amount, false);
        }
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        if (!multiHopLeverage) {
            _addTokens(
                from,
                to,
                collateralId,
                share,
                oldTotalCollateralShare,
                skim
            );
        }
        _yieldBoxShares[to][COLLATERAL_SIG] += share;
        emit LogAddCollateral(skim ? address(yieldBox) : from, to, share);
    }

    /// @dev Concrete implementation of `removeCollateral`.
    function _removeCollateral(
        address from,
        address to,
        uint256 share,
        bool multiHopLeverage
    ) internal {
        userCollateralShare[from] -= share;
        totalCollateralShare -= share;
        if (!multiHopLeverage) {
            yieldBox.transfer(address(this), to, collateralId, share);
        }
        emit LogRemoveCollateral(from, to, share);
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
            totalBorrowCap == 0 || totalBorrow.elastic <= totalBorrowCap,
            "SGL: borrow cap reached"
        );
        userBorrowPart[from] += part;
        emit LogBorrow(from, to, amount, feeAmount, part);

        if (feeAmount > 0) {
            balanceOf[address(penrose)] += feeAmount;
        }

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
        if (part > userBorrowPart[to]) {
            part = userBorrowPart[to];
        }
        require(part > 0, "SGL: nothing to repay");

        (totalBorrow, amount) = totalBorrow.sub(part, true);

        userBorrowPart[to] -= part;

        uint256 share = yieldBox.toShare(assetId, amount, true);
        uint128 totalShare = totalAsset.elastic;
        _addTokens(from, to, assetId, share, uint256(totalShare), skim);
        totalAsset.elastic = totalShare + uint128(share);

        if (share > _yieldBoxShares[from][ASSET_SIG]) {
            _yieldBoxShares[from][ASSET_SIG] = 0; //accrues in time
        } else {
            _yieldBoxShares[from][ASSET_SIG] -= share;
        }

        emit LogRepay(skim ? address(yieldBox) : from, to, amount, part);
    }
}
