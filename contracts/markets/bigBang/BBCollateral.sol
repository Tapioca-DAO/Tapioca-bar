// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BBLendingCommon.sol";

contract BBCollateral is BBLendingCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param from Account to transfer shares from.
    /// @param to The receiver of the tokens.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(
        address from,
        address to,
        bool skim,
        uint256 amount,
        uint256 share
    ) external allowedBorrow(from, share) notSelf(to) notPaused {
        _addCollateral(from, to, skim, amount, share);
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(
        address from,
        address to,
        uint256 share
    ) external notPaused solvent(from) notSelf(to) allowedBorrow(from, share) {
        _removeCollateral(from, to, share);
    }
}
