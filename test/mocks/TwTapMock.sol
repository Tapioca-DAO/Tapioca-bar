// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TwTapMock {
    using SafeERC20 for IERC20;

    address public token;

    constructor(address _token) {
        token = _token;
    }

    function distributeReward(uint256, uint256 _amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
    }

    function rewardTokenIndex(address) external pure returns (uint256) {
        return 1;
    }
}
