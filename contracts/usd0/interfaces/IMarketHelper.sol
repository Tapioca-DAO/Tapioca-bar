// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

interface IMarketHelper {
    /// @notice deposits asset to YieldBox and lends it to Singularity
    /// @param singularity the singularity address
    /// @param _user the address to deposit from and lend to
    /// @param _amount the amount to lend
    function depositAndAddAsset(
        address singularity,
        address _user,
        uint256 _amount,
        bool deposit_,
        bool extractFromSender
    ) external;
}
