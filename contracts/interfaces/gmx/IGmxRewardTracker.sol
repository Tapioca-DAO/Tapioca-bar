// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';

interface IGmxRewardTracker is IERC20 {
    function depositBalances(
        address _account,
        address _depositToken
    ) external view returns (uint256);

    function stakedAmounts(address _account) external view returns (uint256);

    function updateRewards() external;

    function stake(address _depositToken, uint256 _amount) external;

    function stakeForAccount(
        address _fundingAccount,
        address _account,
        address _depositToken,
        uint256 _amount
    ) external;

    function unstake(address _depositToken, uint256 _amount) external;

    function unstakeForAccount(
        address _account,
        address _depositToken,
        uint256 _amount,
        address _receiver
    ) external;

    function tokensPerInterval() external view returns (uint256);

    function claim(address _receiver) external returns (uint256);

    function claimForAccount(
        address _account,
        address _receiver
    ) external returns (uint256);

    function claimable(address _account) external view returns (uint256);

    function averageStakedAmounts(
        address _account
    ) external view returns (uint256);

    function cumulativeRewards(
        address _account
    ) external view returns (uint256);

    function rewardToken() external view returns (address);

    function distributor() external view returns (address);

    function balances(address _account) external view returns (uint256);

    function cumulativeRewardPerToken() external view returns (uint256);

    function previousCumulatedRewardPerToken(
        address _account
    ) external view returns (uint256);
}
