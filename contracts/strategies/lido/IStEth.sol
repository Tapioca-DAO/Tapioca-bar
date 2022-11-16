// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStEth {
    /**
     * @notice Send funds to the pool with optional _referral parameter
     * @dev This function is alternative way to submit funds. Supports optional referral address.
     * @return Amount of StETH shares generated
     */
    function submit(address _referral) external payable returns (uint256);

    function balanceOf(address _user) external view returns (uint256);

    function isStakingPaused() external view returns (bool);
}
