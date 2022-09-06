// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @notice Used for performing swap operations when bidding on LiquidationQueue
interface IBidder {
    /// @notice returns the unique name
    function name() external view returns (string memory);

    /// @notice returns the amount of collateral
    /// @param tokenInId Stablecoin YieldBox asset id
    /// @param amountIn Stablecoin amount
    /// @param data extra data used for retrieving the ouput
    function getOutputAmount(
        uint256 tokenInId,
        uint256 amountIn,
        bytes calldata data
    ) external view returns (uint256);

    /// @notice swap USD0 to collateral
    /// @param tokenInId Stablecoin asset id
    /// @param amountIn Stablecoin amount
    /// @param data extra data used for the swap operation
    function swap(
        uint256 tokenInId,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256);

    /// @notice returns the swapper address who performs the first swap
    /// @dev used for sending funds from the LiquidationQueue contract to it
    function firstStepSwapper() external view returns (address);

    function getInputAmount(
        uint256 tokenInId,
        uint256 amountOut,
        bytes calldata
    ) external view returns (uint256);
}
