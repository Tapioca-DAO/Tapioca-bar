// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ZeroXSwapperMockTarget {
    using SafeERC20 for IERC20;

    bool public state = true;

    receive() external payable {}

    function toggleState() public payable {
        state = !state;
    }

    function transferTokens(address token, uint256 amount) public payable {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
