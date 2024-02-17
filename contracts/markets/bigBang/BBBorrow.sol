// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// Tapioca
import {BBLendingCommon} from "./BBLendingCommon.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract BBBorrow is BBLendingCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @param from Account to borrow for.
    /// @param to The receiver of borrowed tokens.
    /// @param amount Amount to borrow.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(address from, address to, uint256 amount)
        external
        optionNotPaused(PauseType.Borrow)
        notSelf(to)
        solvent(from, false)
        returns (uint256 part, uint256 share)
    {
        if (amount == 0) return (0, 0);
        penrose.reAccrueBigBangMarkets();

        uint256 feeAmount = _computeVariableOpeningFee(amount);
        uint256 allowanceShare =
            _computeAllowanceAmountInAsset(from, exchangeRate, amount + feeAmount, asset.safeDecimals());
        if (allowanceShare == 0) revert AllowanceNotValid();
        _allowedBorrow(from, allowanceShare);
        (part, share) = _borrow(from, to, amount, feeAmount);
    }

    /// @notice Repays a loan.
    /// @dev The bool param is not used but we added it to respect the ISingularity interface for MarketsHelper compatibility
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(address from, address to, bool, uint256 part)
        external
        optionNotPaused(PauseType.Repay)
        notSelf(to)
        returns (uint256 amount)
    {
        updateExchangeRate();

        _accrue();
        penrose.reAccrueBigBangMarkets();

        amount = _repay(from, to, part);
    }
}
