// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {IWeth9} from "tapioca-periph/interfaces/external/weth/IWeth9.sol";
import {ITOFT} from "tapioca-periph/interfaces/oft/ITOFT.sol";

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
contract MarketLiquidatorReceiver is IMarketLiquidatorReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable weth;

    mapping(address tokenIn => address swapper) public swappers;
    mapping(address market => bool whitelisted) public allowedCallers;

    event SwapperAssigned(address indexed tokenIn, address indexed swapper);
    event AllowedCallerSet(address indexed market, bool allowed);

    error NotAuthorized();
    error NotEnough();
    error NoSwapperAssigned();
    error SwapFailed();
    error NotValid();

    constructor(address _weth) {
        if (_weth == address(0)) revert NotValid();
        weth = _weth;
    }

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
    ) external nonReentrant returns (bool) {
        // Check caller
        if (!allowedCallers[msg.sender]) revert NotAuthorized();

        // Check if the initiator is the owner
        if (initiator != owner()) revert NotAuthorized();

        // retrieve swapper
        address assignedSwapper = swappers[tokenIn];
        if (assignedSwapper == address(0)) revert NoSwapperAssigned();

        // check if contract received enough collateral
        uint256 collateralBalance = IERC20(tokenIn).balanceOf(address(this));
        if (collateralBalance < collateralAmount) revert NotEnough();
        SSwapData memory swapData = abi.decode(data, (SSwapData));

        // unwrap TOFT
        uint256 unwrapped = ITOFT(tokenIn).unwrap(address(this), collateralAmount);

        // get ERC20
        address erc20 = ITOFT(tokenIn).erc20();

        // if native, wrap it into WETH
        if (erc20 == address(0)) {
            IWeth9(weth).deposit{value: unwrapped}();
            erc20 = weth;
        }

        // validate swapData;
        // swapTarget & msg.sender whitelist status is validated inside 0xSwapper
        if (address(swapData.data.sellToken) != erc20) revert NotAuthorized();
        if (address(swapData.data.buyToken) != tokenOut) revert NotAuthorized();

        // swap TOFT.erc20() with `tokenOut`
        IERC20(erc20).safeApprove(assignedSwapper, unwrapped);
        uint256 amountOut = IZeroXSwapper(assignedSwapper).swap(swapData.data, collateralAmount, swapData.minAmountOut);
        IERC20(erc20).safeApprove(assignedSwapper, 0);
        if (amountOut < swapData.minAmountOut) revert SwapFailed();

        // tokenOut should be USDO
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        return true;
    }

    /**
     * @notice Set an allowed caller for a market
     * @param _market the market address
     * @param _allowed the allowed status
     */
    function setAllowedCaller(address _market, bool _allowed) external onlyOwner {
        allowedCallers[_market] = _allowed;
        emit AllowedCallerSet(_market, _allowed);
    }

    /// @notice assigns swapper for token
    /// @param _tokenIn token to assign the swapper for
    /// @param _swapper the swapper address
    function assignSwapper(address _tokenIn, address _swapper) external onlyOwner {
        swappers[_tokenIn] = _swapper;
        emit SwapperAssigned(_tokenIn, _swapper);
    }
}
