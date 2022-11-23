// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../../singularity/legacy/mocks/ERC20Mock.sol';

contract BalancerGaugeMock {
    using BoringERC20 for IERC20;

    address public lp_token; //stable pool
    address public reward1;
    address public reward2;

    constructor(
        address _lpToken,
        address _reward1,
        address _reward2
    ) {
        lp_token = _lpToken;
        reward1 = _reward1;
        reward2 = _reward2;
    }

    function balanceOf(address) public view returns (uint256) {
        return IERC20(lp_token).balanceOf(address(this));
    }

    function claimable_reward(address, address)
        external
        view
        returns (uint256)
    {
        uint256 lpBalance = balanceOf(address(this));
        if (lpBalance == 0) return 0;
        return 10 * 1e18;
    }

    function claim_rewards(address, address) external returns (uint256) {
        ERC20Mock(reward1).freeMint(10 * 1e18);
        ERC20Mock(reward2).freeMint(10 * 1e18);
        IERC20(reward1).safeTransfer(msg.sender, 10 * 1e18);
        IERC20(reward2).safeTransfer(msg.sender, 10 * 1e18);
        return 20 * 1e18;
    }

    function deposit(
        uint256 _value,
        address,
        bool
    ) external {
        IERC20(lp_token).safeTransferFrom(msg.sender, address(this), _value);
    }

    function withdraw(uint256, bool) external {
        IERC20(lp_token).safeTransfer(msg.sender, balanceOf(address(this)));
    }

    function reward_tokens(uint256 _index) external view returns (address) {
        if (_index == 0) return reward1;
        return reward2;
    }
}
