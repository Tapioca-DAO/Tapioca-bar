// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {IGmxRewardRouterV2} from "tapioca-periph/interfaces/external/gmx/IGmxRewardRouterV2.sol";
import {IGmxGlpManager} from "tapioca-periph/interfaces/external/gmx/IGmxGlpManager.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {IWeth9} from "tapioca-periph/interfaces/external/weth/IWeth9.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {ITOFT} from "tapioca-periph/interfaces/oft/ITOFT.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGlpMarketLiquidatorReceiver is IMarketLiquidatorReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public swapper;
    address public immutable weth;
    mapping(address => bool) public allowedParticipants;
    ICluster public immutable cluster;
    IGmxRewardRouterV2 private immutable glpRewardRouter;
    IGmxGlpManager private immutable glpManager;

    address public constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    event SwapperAssigned(address indexed oldSwapper, address indexed swapper);
    event AllowedParticipantAssigned(address indexed participant, bool status);

    error NotAuthorized();
    error WhitelistError();
    error NotEnough();
    error SwapFailed();
    error SellGlpFailed();
    error NotValid();

    constructor(
        address _weth,
        ICluster _cluster,
        address _swapper,
        IGmxRewardRouterV2 _glpRewardRouter,
        IGmxGlpManager _glpManager,
        address _owner
    ) {
        if (_weth == address(0)) revert NotValid();
        if (_swapper == address(0)) revert NotValid();
        if (address(_cluster) == address(0)) revert NotValid();
        if (address(_glpRewardRouter) == address(0)) revert NotValid();
        if (address(_glpManager) == address(0)) revert NotValid();

        weth = _weth;
        emit SwapperAssigned(swapper, _swapper);
        swapper = _swapper;
        cluster = _cluster;
        glpManager = _glpManager;
        glpRewardRouter = _glpRewardRouter;

        transferOwnership(_owner);
    }

    struct SSwapData {
        uint256 minAmountOut;
        IZeroXSwapper.SZeroXSwapData data;
    }

    struct SGlpSwapData {
        SSwapData zeroXswapData;
        // Token to swap tsGlp > token > Usdo.
        address token;
        // Min amount of tokens to receive after a sell GLP swap
        uint256 minAmountOut;
    }

    /// @notice returns the swapper sell token
    /// @param marketToken the market's TOFT collateral
    function querySellToken(address marketToken) external pure returns (address) {
        return USDC;
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
        if (!cluster.isWhitelisted(0, msg.sender)) revert WhitelistError();
        if (!cluster.isWhitelisted(0, address(this))) revert WhitelistError();

        // check if contract received enough collateral
        uint256 collateralBalance = IERC20(tokenIn).balanceOf(address(this));
        if (collateralBalance < collateralAmount) revert NotEnough();

        SGlpSwapData memory swapData = abi.decode(data, (SGlpSwapData));

        // unwrap TOFT
        uint256 unwrapped = ITOFT(tokenIn).unwrap(address(this), collateralAmount);
        address sGLP = ITOFT(tokenIn).erc20();

        uint256 tokenAmount = _sellGlp(swapData.token, swapData.minAmountOut, sGLP, unwrapped);

        // validate swapData;
        // swapTarget & msg.sender whitelist status is validated inside 0xSwapper
        if (address(swapData.zeroXswapData.data.sellToken) != swapData.token) revert NotAuthorized();
        if (address(swapData.zeroXswapData.data.buyToken) != tokenOut) revert NotAuthorized();

        // swap TOFT.erc20() with `tokenOut`
        IERC20(swapData.token).safeApprove(swapper, tokenAmount);
        uint256 amountOut =
            IZeroXSwapper(swapper).swap(swapData.zeroXswapData.data, tokenAmount, swapData.zeroXswapData.minAmountOut);
        IERC20(swapData.token).safeApprove(swapper, 0);
        if (amountOut < swapData.zeroXswapData.minAmountOut) revert SwapFailed();

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

    /**
     * @dev Sells GLP for `token`. The `token` is chosen off-chain and is computed to be the best to sell GLP for,
     * for swapping the `token` to USDO.
     *
     * @param token Token to swap for GLP
     * @param minTokenAmountOut Min amount of `token` to receive
     * @param sGLP sGLP address
     * @param glpAmount Amount of GLP to swap for `token`
     *
     * @return tokenAmount Amount of `token` received
     */
    function _sellGlp(address token, uint256 minTokenAmountOut, address sGLP, uint256 glpAmount)
        private
        returns (uint256 tokenAmount)
    {
        IERC20(sGLP).safeApprove(address(glpManager), glpAmount);
        tokenAmount = glpRewardRouter.unstakeAndRedeemGlp(token, glpAmount, minTokenAmountOut, address(this));
        IERC20(sGLP).safeApprove(address(glpManager), 0);
        if (tokenAmount < minTokenAmountOut) revert SellGlpFailed();
    }

    receive() external payable {}
}
