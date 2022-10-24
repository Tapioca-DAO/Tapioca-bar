// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICurveSwapper {
    function curvePool() external view returns (address);

    function yieldBox() external view returns (address);

    /// @notice returns the possible output amount for input share
    /// @param tokenInId YieldBox asset id
    /// @param tokenIndexes The input and the output Curve's pool indexes
    /// @param shareIn Shares to get the amount for
    function getOutputAmount(
        uint256 tokenInId,
        uint256[] calldata tokenIndexes,
        uint256 shareIn
    ) external view returns (uint256 amountOut);

    /// @notice swaps token in with token out
    /// @dev returns both amount and shares
    /// @param tokenInId YieldBox asset id
    /// @param tokenOutId YieldBox asset id
    /// @param tokenIndexes The input and the output Curve's pool indexes
    /// @param shareIn Shares to be swapped
    /// @param amountOutMin Minimum amount to be received
    /// @param to Receiver address
    function swap(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256[] calldata tokenIndexes,
        uint256 shareIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut, uint256 shareOut);
}
