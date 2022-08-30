// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @notice Used for performing USD0->collateral swap when bidding on LiquidationQueue
interface IUsdoBidder {
    /// @notice returns the unique name
    function name() external view returns (string memory);

    /// @notice returns the amount of collateral
    /// @param amountIn USD0 amount
    /// @param data extra data used for retrieving the ouput
    function getOutputAmount(uint256 amountIn, bytes calldata data)
        external
        view
        returns (uint256);

    /// @notice swap USD0 to collateral
    /// @param bidder the sender to swap it from
    /// @param amountIn USD0 amount
    /// @param data extra data used for the swap operation
    function swap(
        address bidder,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256);
}
