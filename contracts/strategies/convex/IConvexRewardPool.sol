// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IConvexRewardPool {
    function withdrawAndUnwrap(uint256 _amount, bool claim)
        external
        returns (bool);

    function rewardToken() external view returns (address);

    function earned(address _user) external view returns (uint256);

    function rewards(address _user) external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function balanceOf(address _user) external view returns (uint256);

    function getReward(address _account, bool _claimExtras)
        external
        returns (bool);

    function stakeFor(address _for, uint256 _amount) external;
}
