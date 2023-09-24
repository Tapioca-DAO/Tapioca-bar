// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BBLendingCommon.sol";

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
    function borrow(
        address from,
        address to,
        uint256 amount
    )
        external
        optionNotPaused(PauseType.Borrow)
        notSelf(to)
        solvent(from)
        returns (uint256 part, uint256 share)
    {
        require(amount >= debtStartPoint, "BigBang: borrow amount too small");

        if (amount == 0) return (0, 0);
        uint256 feeAmount = (amount * borrowOpeningFee) / FEE_PRECISION;
        uint256 allowanceShare = _computeAllowanceAmountInAsset(
            from,
            exchangeRate,
            amount + feeAmount,
            asset.safeDecimals()
        );
        _allowedBorrow(from, allowanceShare);
        (part, share) = _borrow(from, to, amount);
    }

    /// @notice Repays a loan.
    /// @dev The bool param is not used but we added it to respect the ISingularity interface for MarketsHelper compatibility
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        address from,
        address to,
        bool,
        uint256 part
    )
        external
        optionNotPaused(PauseType.Repay)
        notSelf(to)
        returns (uint256 amount)
    {
        updateExchangeRate();

        _accrue();

        amount = _repay(from, to, part);

        uint256 allowanceShare = _computeAllowanceAmountInAsset(
            from,
            exchangeRate,
            amount,
            asset.safeDecimals()
        );
        _allowedBorrow(from, allowanceShare);
    }
}
