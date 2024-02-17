// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/// @title ExampleMarketLiquidatorReceiver.
/// @notice Example of a liquidator receiver contract.
/// @dev This contract uses ZeroXSwapper to swap tokens.
contract ExampleMarketLiquidatorReceiver is IMarketLiquidatorReceiver, Ownable {
    using SafeERC20 for IERC20;

    struct OracleInfo {
        bytes data;
        address target;
        uint256 precision;
    }

    mapping(address tokenIn => address swapper) public swappers;

    uint256 private _entered;

    event SwapperAssigned(address indexed tokenIn, address indexed swapper);

    error NotAuthorized();
    error NotEnough();
    error Reentrancy();
    error NoSwapperAssigned();
    error NotValid();
    error SwapFailed();

    constructor() {}

    struct SSwapData {
        uint256 minAmountOut;
        IZeroXSwapper.SZeroXSwapData data;
    }

    /// @notice action performed during the liquidation process
    /// @param initiator the address that initiated the liquidation
    /// @param tokenIn received token
    /// @param tokenOut output token
    /// @param collateralAmount received amount
    /// @param data Expect a ZeroXSwapper swap data
    function onCollateralReceiver(
        address initiator,
        address tokenIn,
        address tokenOut,
        uint256 collateralAmount,
        bytes calldata data
    ) external returns (bool) {
        if (_entered != 0) revert Reentrancy();
        _entered = 1;
        if (initiator != owner()) revert NotAuthorized();

        address swapperTokenIn = swappers[tokenIn];
        if (swapperTokenIn == address(0)) revert NoSwapperAssigned();

        uint256 collateralBalance = IERC20(tokenIn).balanceOf(address(this));
        if (collateralBalance < collateralAmount) revert NotEnough();
        SSwapData memory swapData = abi.decode(data, (SSwapData));

        IERC20(tokenIn).safeApprove(swapperTokenIn, collateralAmount);
        uint256 amountOut = IZeroXSwapper(swapperTokenIn).swap(swapData.data, collateralAmount, swapData.minAmountOut);
        IERC20(tokenIn).safeApprove(swapperTokenIn, 0);
        if (amountOut < swapData.minAmountOut) revert SwapFailed();
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        _entered = 0;
        return true;
    }

    /// @notice assigns swapper for token
    /// @param _tokenIn token to assign the swapper for
    /// @param _swapper the swapper address
    function assignSwapper(address _tokenIn, address _swapper) external onlyOwner {
        swappers[_tokenIn] = _swapper;
        emit SwapperAssigned(_tokenIn, _swapper);
    }
}
