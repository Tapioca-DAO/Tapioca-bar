// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @notice Used for performing swap operations when bidding on LiquidationQueue
/// @dev It can be Stable>WETH>tAsset or Stable>USD0>tAsset
interface IStableBidder {
    /// @notice returns the unique name
    function name() external view returns (string memory);

    /// @notice returns the amount of collateral
    /// @param stableAssetId Stablecoin YieldBox asset id
    /// @param amountIn Stablecoin amount
    /// @param data extra data used for retrieving the ouput
    function getOutputAmount(
        uint256 stableAssetId,
        uint256 amountIn,
        bytes calldata data
    ) external view returns (uint256);

    /// @notice swap USD0 to collateral
    /// @param bidder the sender to swap it from
    /// @param stableAssetId Stablecoin asset id
    /// @param amountIn Stablecoin amount
    /// @param data extra data used for the swap operation
    function swap(
        address bidder,
        uint256 stableAssetId,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256);
}
