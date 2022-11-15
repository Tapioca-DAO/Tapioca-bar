// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../singularity/legacy/mocks/ERC20Mock.sol';

contract LPStakingMock {
    using BoringERC20 for IERC20;

    ERC20Mock public lpToken;
    ERC20Mock public reward;

    constructor(address _lpToken, address _stg) {
        lpToken = ERC20Mock(_lpToken);
        reward = ERC20Mock(_stg);
    }

    function deposit(uint256, uint256 amount) external {
        if (amount == 0) {
            //claiming rewards
            reward.freeMint(10 * 1e18);
            reward.transfer(msg.sender, 10 * 1e18);
        }
        lpToken.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256, uint256 amount) external {
        lpToken.freeMint(amount);
        lpToken.transfer(msg.sender, amount);
    }

    function userInfo(address)
        external
        view
        returns (uint256 amount, uint256 rewardDebt)
    {
        amount = lpToken.balanceOf(address(this));
        rewardDebt = 0;
    }

    function poolInfo(uint256)
        external
        view
        returns (
            address,
            uint256,
            uint256,
            uint256
        )
    {
        return (address(lpToken), 0, 0, 0);
    }

    function stargate() external view returns (address) {
        return address(reward);
    }

    function pendingStargate(uint256, address) external pure returns (uint256) {
        return 10 * 1e18;
    }
}
