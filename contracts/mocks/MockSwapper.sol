// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

import "../swappers/ISwapper.sol";
import "../interfaces/IPenrose.sol";
import "../../yieldbox/contracts/YieldBox.sol";

/// @notice Always gives out the minimum requested amount, if it has it.
/// @notice Do not use the other functions.
contract MockSwapper is ISwapper {
    using BoringERC20 for IERC20;

    YieldBox private immutable yieldBox;

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    function getOutputAmount(
        uint256 /* tokenInId */,
        uint256 /* shareIn */,
        bytes calldata /* dexData */
    ) external pure returns (uint256) {
        return 0;
    }

    function getInputAmount(
        uint256 /* tokenOutId */,
        uint256 /* shareOut */,
        bytes calldata /* dexData */
    ) external pure returns (uint256) {
        return 0;
    }

    /// @notice swaps token in with token out
    /// @dev returns both amount and shares
    /// @param tokenOutId YieldBox asset id
    /// @param to Receiver address
    /// @param amountOutMin Minimum amount to be received
    function swap(
        uint256 /* tokenInId */,
        uint256 tokenOutId,
        uint256 /* shareIn */,
        address to,
        uint256 amountOutMin,
        bytes calldata /* dexData */
    ) external returns (uint256 amountOut, uint256 shareOut) {
        shareOut = yieldBox.toShare(tokenOutId, amountOutMin, true);
        amountOut = amountOutMin;
        yieldBox.transfer(address(this), to, tokenOutId, shareOut);
    }
}
