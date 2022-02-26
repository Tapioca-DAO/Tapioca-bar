// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import '@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol';
import '../libraries/IUniswapV2Factory.sol';
import '../libraries/IUniswapV2Pair.sol';
import './ISwapper.sol';
import '../bar/TapiocaBar.sol';

/// Modified from https://github.com/sushiswap/kashi-lending/blob/master/contracts/swappers/SushiSwapSwapper.sol

contract Swapper is ISwapper {
    using BoringMath for uint256;

    // Local variables
    TapiocaBar public immutable tapiocaBar;
    IUniswapV2Factory public immutable factory;
    bytes32 public immutable pairCodeHash;

    constructor(
        TapiocaBar tapiocaBar_,
        IUniswapV2Factory factory_,
        bytes32 pairCodeHash_
    ) public {
        tapiocaBar = tapiocaBar_;
        factory = factory_;
        pairCodeHash = pairCodeHash_;
    }

    // Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // Given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        uint256 numerator = reserveIn.mul(amountOut).mul(1000);
        uint256 denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }

    // Swaps to a flexible amount, from an exact input amount
    /// @inheritdoc ISwapper
    function swap(
        IERC20 fromToken,
        uint256 fromTokenId,
        IERC20 toToken,
        uint256 toTokenId,
        address recipient,
        uint256 shareToMin,
        uint256 shareFrom
    ) public override returns (uint256 extraShare, uint256 shareReturned) {
        (IERC20 token0, IERC20 token1) = fromToken < toToken ? (fromToken, toToken) : (toToken, fromToken);
        IUniswapV2Pair pair = IUniswapV2Pair(
            uint256(
                keccak256(abi.encodePacked(hex'ff', factory, keccak256(abi.encodePacked(address(token0), address(token1))), pairCodeHash))
            )
        );

        (uint256 amountFrom, ) = tapiocaBar.withdraw(fromTokenId, address(this), address(pair), 0, shareFrom);

        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
        uint256 amountTo;
        if (toToken > fromToken) {
            amountTo = getAmountOut(amountFrom, reserve0, reserve1);
            pair.swap(0, amountTo, address(tapiocaBar), new bytes(0));
        } else {
            amountTo = getAmountOut(amountFrom, reserve1, reserve0);
            pair.swap(amountTo, 0, address(tapiocaBar), new bytes(0));
        }
        (, shareReturned) = tapiocaBar.deposit(toTokenId, address(tapiocaBar), recipient, amountTo, 0);
        extraShare = shareReturned.sub(shareToMin);
    }

    // Swaps to an exact amount, from a flexible input amount
    /// @inheritdoc ISwapper
    function swapExact(
        IERC20 fromToken,
        uint256 fromTokenId,
        IERC20 toToken,
        uint256 toTokenId,
        address recipient,
        address refundTo,
        uint256 shareFromSupplied,
        uint256 shareToExact
    ) public override returns (uint256 shareUsed, uint256 shareReturned) {
        IUniswapV2Pair pair;
        {
            (IERC20 token0, IERC20 token1) = fromToken < toToken ? (fromToken, toToken) : (toToken, fromToken);
            pair = IUniswapV2Pair(
                uint256(
                    keccak256(
                        abi.encodePacked(hex'ff', factory, keccak256(abi.encodePacked(address(token0), address(token1))), pairCodeHash)
                    )
                )
            );
        }
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();

        uint256 amountToExact = tapiocaBar.toAmount(fromTokenId, shareToExact, true);

        uint256 amountFrom;
        if (toToken > fromToken) {
            amountFrom = getAmountIn(amountToExact, reserve0, reserve1);
            (, shareUsed) = tapiocaBar.withdraw(fromTokenId, address(this), address(pair), amountFrom, 0);
            pair.swap(0, amountToExact, address(tapiocaBar), '');
        } else {
            amountFrom = getAmountIn(amountToExact, reserve1, reserve0);
            (, shareUsed) = tapiocaBar.withdraw(fromTokenId, address(this), address(pair), amountFrom, 0);
            pair.swap(amountToExact, 0, address(tapiocaBar), '');
        }
        tapiocaBar.deposit(toTokenId, address(tapiocaBar), recipient, 0, shareToExact);
        shareReturned = shareFromSupplied.sub(shareUsed);
        if (shareReturned > 0) {
            tapiocaBar.transfer(fromTokenId, address(this), refundTo, shareReturned);
        }
    }
}
