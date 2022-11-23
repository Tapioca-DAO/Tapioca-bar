// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalancerGauge {
    function lp_token() external view returns (address);

    function balanceOf(address _user) external view returns (uint256);

    function claimable_reward(address _user, address _token)
        external
        view
        returns (uint256);

    function claim_rewards(address _user, address _receiver)
        external
        returns (uint256);

    function deposit(
        uint256 _value,
        address _user,
        bool _claimRewards
    ) external;

    function withdraw(uint256 _value, bool _claimRewards) external;

    function reward_tokens(uint256 _index) external view returns (address);
}
