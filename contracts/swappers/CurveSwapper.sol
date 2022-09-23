// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../libraries/ICurvePool.sol';

import '../../yieldbox/contracts/YieldBox.sol';
import '../BeachBar.sol';

contract CurveSwapper {
    using BoringERC20 for IERC20;

    ICurvePool public curvePool;

    YieldBox private immutable yieldBox;

    constructor(ICurvePool _curvePool, BeachBar _bar) {
        curvePool = _curvePool;
        yieldBox = _bar.yieldBox();
    }

    /// @notice returns the possible output amount for input share
    /// @param tokenInId YieldBox asset id
    /// @param tokenIndexes The input and the output Curve's pool indexes
    /// @param shareIn Shares to get the amount for
    function getOutputAmount(
        uint256 tokenInId,
        uint256[] calldata tokenIndexes,
        uint256 shareIn
    ) external view returns (uint256 amountOut) {
        uint256 amountIn = yieldBox.toAmount(tokenInId, shareIn, false);
        amountOut = curvePool.get_dy(
            int128(int256(tokenIndexes[0])),
            int128(int256(tokenIndexes[1])),
            amountIn
        );
    }

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
    ) external returns (uint256 amountOut, uint256 shareOut) {
        (uint256 amountIn, ) = yieldBox.withdraw(
            tokenInId,
            address(this),
            address(this),
            0,
            shareIn
        );

        amountOut = _swapTokensForTokens(
            int128(int256(tokenIndexes[0])),
            int128(int256(tokenIndexes[1])),
            amountIn,
            amountOutMin
        );

        (, address tokenOutAddress, , ) = yieldBox.assets(tokenOutId);
        IERC20(tokenOutAddress).approve(address(yieldBox), amountOut);
        (, shareOut) = yieldBox.depositAsset(
            tokenOutId,
            address(this),
            to,
            amountOut,
            0
        );
    }

    function _swapTokensForTokens(
        int128 i,
        int128 j,
        uint256 amountIn,
        uint256 amountOutMin
    ) private returns (uint256) {
        address tokenOut = curvePool.coins(uint256(uint128(j)));

        uint256 outputAmount = curvePool.get_dy(i, j, amountIn);
        require(outputAmount >= amountOutMin, 'insufficient-amount-out');

        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));
        curvePool.exchange(i, j, amountIn, amountOutMin);
        uint256 balanceAfter = IERC20(tokenOut).balanceOf(address(this));
        require(balanceAfter > balanceBefore, 'swap failed');

        return balanceAfter - balanceBefore;
    }
}
