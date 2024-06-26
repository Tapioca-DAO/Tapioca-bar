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

contract MarketLiquidatorReceiver is IMarketLiquidatorReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public swapper;
    address public immutable weth;
    mapping(address => bool) public allowedParticipants;

    event SwapperAssigned(address indexed oldSwapper, address indexed swapper);
    event AllowedParticipantAssigned(address indexed participant, bool status);

    error NotAuthorized();
    error WhitelistError();
    error NotEnough();
    error SwapFailed();
    error NotValid();

    constructor(address _weth, address _swapper) {
        if (_weth == address(0)) revert NotValid();
        if (_swapper == address(0)) revert NotValid();
        
        weth = _weth;
        swapper = _swapper;
    }

    struct SSwapData {
        uint256 minAmountOut;
        IZeroXSwapper.SZeroXSwapData data;
    }

    /// @notice returns the swapper sell token
    /// @param marketToken the market's TOFT collateral
    function querySellToken(address marketToken) external view returns(address) {
        return ITOFT(marketToken).erc20();
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
        if (!allowedParticipants[initiator]) revert NotAuthorized();

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
        IERC20(erc20).safeApprove(swapper, unwrapped);
        uint256 amountOut = IZeroXSwapper(swapper).swap(swapData.data, unwrapped, swapData.minAmountOut);
        IERC20(erc20).safeApprove(swapper, 0);
        if (amountOut < swapData.minAmountOut) revert SwapFailed();

        // tokenOut should be USDO
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        return true;
    }

    /// @notice assigns swapper for token
    /// @param _swapper the swapper address
    function setSwapper(address _swapper) external onlyOwner {
        emit SwapperAssigned(swapper, _swapper);
        swapper = _swapper;
    }

    /// @notice assigns participant status
    /// @param _participant the EOA/contract address
    /// @param _val the status
    function setAllowedParticipant(address _participant, bool _val) external onlyOwner {
        allowedParticipants[_participant] = _val;
        emit AllowedParticipantAssigned(_participant, _val);
    }


    receive() external payable {}
}
