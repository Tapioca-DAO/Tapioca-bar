// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStkAave {
    function REWARD_TOKEN() external view returns (address);

    function stake(address to, uint256 amount) external;

    function redeem(address to, uint256 amount) external;

    function cooldown() external;

    function claimRewards(address to, uint256 amount) external;

    function stakerRewardsToClaim(address _user)
        external
        view
        returns (uint256);

    function stakersCooldowns(address _user) external view returns (uint256);
    
    //   mapping(address => uint256) public stakersCooldowns;
}
