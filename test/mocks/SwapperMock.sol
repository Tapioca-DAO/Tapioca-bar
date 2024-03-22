// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";

/// @notice Always gives out the minimum requested amount, if it has it.
/// @notice Do not use the other functions.
contract SwapperMock {
    using SafeERC20 for IERC20;

    struct SwapTokensData {
        address tokenIn;
        uint256 tokenInId;
        address tokenOut;
        uint256 tokenOutId;
    }

    struct SwapAmountData {
        uint256 amountIn;
        uint256 shareIn;
        uint256 amountOut;
        uint256 shareOut;
    }

    struct YieldBoxData {
        bool withdrawFromYb;
        bool depositToYb;
    }

    struct SwapData {
        SwapTokensData tokensData;
        SwapAmountData amountData;
        YieldBoxData yieldBoxData;
    }

    YieldBox private immutable yieldBox;

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    //Add more overloads if needed

    function getOutputAmount(SwapData calldata, bytes calldata) external pure returns (uint256 amountOut) {
        return 0;
    }

    function getInputAmount(SwapData calldata, bytes calldata) external pure returns (uint256) {
        return 0;
    }

    function swap(SwapData calldata swapData, uint256 amountOutMin, address to, bytes memory)
        external
        payable
        returns (uint256 amountOut, uint256 shareOut)
    {
        amountOut = amountOutMin;

        if (swapData.tokensData.tokenOutId > 0) {
            shareOut = yieldBox.toShare(swapData.tokensData.tokenOutId, amountOutMin, true);
            yieldBox.transfer(address(this), to, swapData.tokensData.tokenOutId, shareOut);
        } else {
            shareOut = amountOut * 1e8;
            if (swapData.tokensData.tokenOut != address(0)) {
                IERC20(swapData.tokensData.tokenOut).safeTransfer(to, amountOut);
            } else {
                (bool sent,) = to.call{value: amountOut}("");
                require(sent, "MockSwapper: failed to transfer ETH");
            }
        }
    }

    function buildSwapData(address tokenIn, address tokenOut, uint256 amountIn, uint256 shareIn)
        external
        pure
        returns (SwapData memory)
    {
        return _buildSwapData(tokenIn, tokenOut, 0, 0, amountIn, shareIn, false, false);
    }

    function buildSwapData(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountIn,
        uint256 shareIn,
        bool withdrawFromYb,
        bool depositToYb
    ) external pure returns (SwapData memory) {
        return _buildSwapData(
            address(0), address(0), tokenInId, tokenOutId, amountIn, shareIn, withdrawFromYb, depositToYb
        );
    }

    function _buildSwapData(
        address tokenIn,
        address tokenOut,
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountIn,
        uint256 shareIn,
        bool withdrawFromYb,
        bool depositToYb
    ) internal pure returns (SwapData memory swapData) {
        SwapAmountData memory swapAmountData;
        swapAmountData.amountIn = amountIn;
        swapAmountData.shareIn = shareIn;

        SwapTokensData memory swapTokenData;
        swapTokenData.tokenIn = tokenIn;
        swapTokenData.tokenOut = tokenOut;
        swapTokenData.tokenInId = tokenInId;
        swapTokenData.tokenOutId = tokenOutId;

        YieldBoxData memory swapYBData;
        swapYBData.withdrawFromYb = withdrawFromYb;
        swapYBData.depositToYb = depositToYb;

        swapData.tokensData = swapTokenData;
        swapData.amountData = swapAmountData;
        swapData.yieldBoxData = swapYBData;
    }

    receive() external payable {}
}
