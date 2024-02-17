// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import "./SGLLendingCommon.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGLBorrow is SGLLendingCommon {
    using RebaseLibrary for Rebase;

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
        solvent(from, false)
        notSelf(to)
        returns (uint256 part, uint256 share)
    {
        if (amount == 0) return (0, 0);
        uint256 feeAmount = (amount * borrowOpeningFee) / FEE_PRECISION;
        uint256 allowanceShare =
            _computeAllowanceAmountInAsset(from, exchangeRate, amount + feeAmount, _safeDecimals(asset));

        if (allowanceShare == 0) revert AllowanceNotValid();

        _allowedBorrow(from, allowanceShare);

        (part, share) = _borrow(from, to, amount);
    }

    /// @notice Repays a loan.
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(address from, address to, bool skim, uint256 part)
        external
        optionNotPaused(PauseType.Repay)
        notSelf(to)
        returns (uint256 amount)
    {
        updateExchangeRate();

        _accrue();

        amount = _repay(from, to, skim, part);
    }
}
