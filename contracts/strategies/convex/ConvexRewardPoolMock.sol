// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../../singularity/legacy/mocks/ERC20Mock.sol';

contract ConvexRewardPoolMock {
    using BoringERC20 for IERC20;

    address public lpToken;
    address public rewardToken;

    constructor(address _lpToken, address _rewardToken) {
        lpToken = _lpToken;
        rewardToken = _rewardToken;
    }

    function balanceOf(address) public view returns (uint256) {
        uint256 balance = IERC20(lpToken).balanceOf(address(this));
        return balance;
    }

    function stakeFor(address, uint256 _amount) external {
        IERC20(lpToken).safeTransferFrom(msg.sender, address(this), _amount);
    }

    function withdrawAndUnwrap(uint256 _amount, bool) external returns (bool) {
        IERC20(lpToken).safeTransfer(msg.sender, _amount);
        return true;
    }

    function rewards(address) external view returns (uint256) {
        uint256 bal = balanceOf(address(this));
        if (bal == 0) return 0;
        return 10 * 1e18;
    }
}
