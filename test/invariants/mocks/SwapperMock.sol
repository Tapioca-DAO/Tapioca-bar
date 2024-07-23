// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Contracts
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";

// Mocks
import {ERC20Mock} from "test/mocks/ERC20Mock.sol";

// Interfaces
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";

/// @notice Always gives out the minimum requested amount, if it has it.
/// @notice Do not use the other functions.
contract SwapperMock {
    using SafeERC20 for IERC20;

    IERC20 internal usdo;

    constructor(IERC20 _usdo) {
        usdo = _usdo;
    }

    function swap(IZeroXSwapper.SZeroXSwapData calldata swapperData, uint256 amountIn, uint256 minAmountOut)
        external
        payable
        returns (uint256 amountOut)
    {
        swapperData.sellToken.transferFrom(msg.sender, address(this), amountIn);

        if (address(swapperData.buyToken) != address(usdo)) {
            ERC20Mock(address(swapperData.buyToken)).mint(address(this), minAmountOut);
        }
        swapperData.buyToken.transfer(msg.sender, minAmountOut);

        amountOut = minAmountOut;
    }
}
