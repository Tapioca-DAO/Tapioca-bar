// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';

/// Modified from https://github.com/sushiswap/kashi-lending/blob/master/contracts/interfaces/ISwapper.sol
interface ISwapper {
    /// @notice Withdraws 'amountFrom' of token 'from' from the BeachBar account for this swapper.
    /// Swaps it for at least 'amountToMin' of token 'to'.
    /// Transfers the swapped tokens of 'to' into the BeachBar using a plain ERC20 transfer.
    /// Returns the amount of tokens 'to' transferred to BeachBar.
    /// (The BeachBar skim function will be used by the caller to get the swapped funds).
    function swap(
        IERC20 fromToken,
        uint256 fromTokenId,
        IERC20 toToken,
        uint256 toTokenId,
        address recipient,
        uint256 shareToMin,
        uint256 shareFrom
    ) external returns (uint256 extraShare, uint256 shareReturned);

    /// @notice Calculates the amount of token 'from' needed to complete the swap (amountFrom),
    /// this should be less than or equal to amountFromMax.
    /// Withdraws 'amountFrom' of token 'from' from the BeachBar account for this swapper.
    /// Swaps it for exactly 'exactAmountTo' of token 'to'.
    /// Transfers the swapped tokens of 'to' into the BeachBar using a plain ERC20 transfer.
    /// Transfers allocated, but unused 'from' tokens within the BeachBar to 'refundTo' (amountFromMax - amountFrom).
    /// Returns the amount of 'from' tokens withdrawn from BeachBar (amountFrom).
    /// (The BeachBar skim function will be used by the caller to get the swapped funds).
    function swapExact(
        IERC20 fromToken,
        uint256 fromTokenId,
        IERC20 toToken,
        uint256 toTokenId,
        address recipient,
        address refundTo,
        uint256 shareFromSupplied,
        uint256 shareToExact
    ) external returns (uint256 shareUsed, uint256 shareReturned);
}
