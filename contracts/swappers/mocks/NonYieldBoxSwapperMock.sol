// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

contract NonYieldBoxSwapperMock {
    using BoringERC20 for IERC20;

    function getOutputAmount(
        address,
        address,
        uint256 amountIn,
        bytes calldata
    ) external pure returns (uint256 amountOut) {
        return amountIn;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        bytes calldata
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        if (tokenOut != address(0)) {
            IERC20(tokenOut).safeTransfer(msg.sender, amountOutMin);
        } else {
            (bool sent, ) = msg.sender.call{value: amountOutMin}("");
            require(sent, "Failed");
        }
        return amountOutMin;
    }
}
