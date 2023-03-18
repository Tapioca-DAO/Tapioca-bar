// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

interface INonYieldBoxSwapper {
    /// @notice get output amount
    /// @param tokenIn ERC20 token in address
    /// @param tokenOut ERC20 token out address
    /// @param amountIn ERC20 amount
    /// @param data AMM data
    /// @return amountOut swap output amount
    function getOutputAmount(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata data
    ) external view returns (uint256 amountOut);

    /// @notice swaps token in with token out
    /// @dev returns both amount and shares
    /// @param tokenIn ERC20 token in address
    /// @param tokenOut ERC20 token out address
    /// @param amountIn ERC20 amount
    /// @param amountOutMin Minimum amount to be received
    /// @param data AMM data
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        bytes calldata data
    ) external returns (uint256 amountOut);
}
