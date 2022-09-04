// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../libraries/IUniswapV2Factory.sol';
import '../libraries/UniswapV2Library.sol';
import '../libraries/IUniswapV2Pair.sol';
import '../bar/BeachBar.sol';
import '../bar/YieldBox.sol';

/// Modified from https://github.com/sushiswap/kashi-lending/blob/master/contracts/swappers/SushiSwapMultiSwapper.sol


contract MultiSwapper {
    using BoringERC20 for IERC20;

    address private immutable factory;

    BeachBar private immutable beachBar;
    YieldBox private immutable yieldBox;

    bytes32 private immutable pairCodeHash;

    constructor(
        address _factory,
        BeachBar _tapiocaBar,
        bytes32 _pairCodeHash
    ) {
        factory = _factory;
        beachBar = _tapiocaBar;
        yieldBox = _tapiocaBar.yieldBox();
        pairCodeHash = _pairCodeHash;
    }

    function getOutputAmount(
        uint256 tokenInId,
        address[] calldata path,
        uint256 shareIn
    ) external view returns (uint256 amountOut) {
        uint256 amountIn = yieldBox.toAmount(tokenInId, shareIn, false);
        uint256[] memory amounts = UniswapV2Library.getAmountsOut(
            factory,
            amountIn,
            path,
            pairCodeHash
        );
        amountOut = amounts[amounts.length - 1];
    }

    function swap(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountMinOut,
        address to,
        address[] calldata path,
        uint256 shareIn
    ) external returns (uint256 amountOut, uint256 shareOut) {
        (uint256 amountIn, ) = yieldBox.withdraw(
            tokenInId,
            address(this),
            address(this),
            0,
            shareIn
        );

        amountOut = _swapExactTokensForTokens(
            amountIn,
            amountMinOut,
            path,
            address(this)
        );

        IERC20(path[path.length - 1]).approve(address(yieldBox), amountOut);
        (, shareOut) = yieldBox.depositAsset(
            tokenOutId,
            address(this),
            to,
            amountOut,
            0
        );
    }

    // Swaps an exact amount of tokens for another token through the path passed as an argument
    // Returns the amount of the final token
    function _swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to
    ) internal returns (uint256 amountOut) {
        uint256[] memory amounts = UniswapV2Library.getAmountsOut(
            factory,
            amountIn,
            path,
            pairCodeHash
        );
        amountOut = amounts[amounts.length - 1];
        require(amountOut >= amountOutMin, 'insufficient-amount-out');
        // Required for the next step
        IERC20(path[0]).safeTransfer(
            UniswapV2Library.pairFor(factory, path[0], path[1], pairCodeHash),
            amountIn
        );
        _swap(amounts, path, to);
    }

    // requires the initial amount to have already been sent to the first pair
    function _swap(
        uint256[] memory amounts,
        address[] memory path,
        address _to
    ) internal virtual {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = UniswapV2Library.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2
                ? UniswapV2Library.pairFor(
                    factory,
                    output,
                    path[i + 2],
                    pairCodeHash
                )
                : _to;
            IUniswapV2Pair(
                UniswapV2Library.pairFor(factory, input, output, pairCodeHash)
            ).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }
}
