// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IMultiSwapper {
    function swap(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountMinOut,
        address to,
        address[] calldata path,
        uint256 shareIn
    ) external returns (uint256 amountOut, uint256 shareOut);

    function getOutputAmount(
        uint256 tokenInId,
        address[] calldata path,
        uint256 shareIn
    ) external view returns (uint256 amountOut);

    function getInputAmount(
        uint256 tokenOutId,
        address[] calldata path,
        uint256 shareOut
    ) external view returns (uint256 amountIn);
}
