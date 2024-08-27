// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// Tapioca
import {IUsdo} from "tap-utils/interfaces/oft/IUsdo.sol";
import {BBCommon} from "./BBCommon.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract BBLendingCommon is BBCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error BorrowCapReached();
    error NothingToRepay();
    error RepayAmountNotValid();

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _addCollateral(address from, address to, bool skim, uint256 amount, uint256 share, bool addTokens)
        internal
    {
        if (share == 0) {
            share = yieldBox.toShare(collateralId, amount, false);
        }
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        if (addTokens) _addTokens(from, collateralId, share, oldTotalCollateralShare, skim);
        emit LogAddCollateral(skim ? address(yieldBox) : from, to, share);
    }

    /// @dev Concrete implementation of `removeCollateral`.
    function _removeCollateral(address from, address to, uint256 share) internal {
        userCollateralShare[from] -= share;
        totalCollateralShare -= share;
        emit LogRemoveCollateral(from, to, share);
        yieldBox.transfer(address(this), to, collateralId, share);
    }

    /// @dev Concrete implementation of `borrow`.
    function _borrow(address from, address to, uint256 amount, uint256 feeAmount)
        internal
        returns (uint256 part, uint256 share)
    {
        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);

        if (totalBorrowCap > 0) {
            if (totalBorrow.elastic > totalBorrowCap) revert BorrowCapReached();
        }

        userBorrowPart[from] += part;
        emit LogBorrow(from, to, amount, feeAmount, part);

        //mint USDO
        IUsdo(address(asset)).mint(address(this), amount);

        //deposit borrowed amount to user
        share = _depositAmountToYb(asset, to, assetId, amount);
    }

    /// @dev Concrete implementation of `repay`.
    function _repay(address from, address to, uint256 part, bool checkAllowance) internal returns (uint256 amount) {
        if (part > userBorrowPart[to]) {
            part = userBorrowPart[to];
        }
        if (part == 0) revert NothingToRepay();

        // @dev check allowance
        if (checkAllowance && msg.sender != from) {
            uint256 partInAmount;
            Rebase memory _totalBorrow = totalBorrow;
            (_totalBorrow, partInAmount) = _totalBorrow.sub(part, true);
            uint256 allowanceShare =
                _computeAllowanceAmountInAsset(to, exchangeRate, partInAmount, _safeDecimals(asset));
            if (allowanceShare == 0) revert NotEnough();
            _allowedLend(from, allowanceShare);
        }

        // @dev sub `part` of totalBorrow
        (totalBorrow, amount) = totalBorrow.sub(part, true);
        userBorrowPart[to] -= part;

        // @dev amount includes the opening & accrued fees
        uint256 _share = yieldBox.toShare(assetId, amount, false);
        bool isErr = pearlmit.transferFromERC1155(from, address(this), address(yieldBox), assetId, _share);
        if (isErr) {
            revert TransferFailed();
        }
        (uint256 amountOut,) = yieldBox.withdraw(assetId, address(this), address(this), 0, _share);

        // @dev burn USDO
        IUsdo(address(asset)).burn(address(this), amountOut);

        emit LogRepay(from, to, amount, part);
    }

    function _safeDecimals(IERC20 token) internal view returns (uint8) {
        (bool success, bytes memory data) = address(token).staticcall(abi.encodeWithSelector(0x313ce567)); //decimals() selector
        return success && data.length == 32 ? abi.decode(data, (uint8)) : 18;
    }
}
