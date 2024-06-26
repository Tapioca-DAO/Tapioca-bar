// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

// Tapioca
import {IGmxRewardRouterV2} from "tapioca-periph/interfaces/external/gmx/IGmxRewardRouterV2.sol";
import {IGmxGlpManager} from "tapioca-periph/interfaces/external/gmx/IGmxGlpManager.sol";
import {BaseLeverageExecutor, SLeverageSwapData} from "./BaseLeverageExecutor.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {ITOFT} from "tapioca-periph/interfaces/oft/ITOFT.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

struct SGlpLeverageSwapData {
    SLeverageSwapData swapData;
    // Token to swap USDO > token > tsGLP.
    address token;
    // Min amount of tokens to receive after a buy/sell GLP swap
    // In the case of a buy swap, it represents the min amount of GLP to receive
    // In the case of a sell swap, it represents the min amount of `token` to receive
    uint256 minAmountOut;
}

/// @title AssetToSGLPLeverageExecutor
/// @notice Contract for leverage executor for tsGLP markets
contract AssetToSGLPLeverageExecutor is BaseLeverageExecutor, Pausable {
    using SafeApprove for address;
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    IGmxRewardRouterV2 private immutable glpRewardRouter;
    IGmxGlpManager private immutable glpManager;

    // ************** //
    // *** ERRORS *** //
    // ************** //

    error NotEnough(uint256 expected, uint256 received);

    constructor(
        IZeroXSwapper _swapper,
        ICluster _cluster,
        IGmxRewardRouterV2 _glpRewardRouter,
        address _weth,
        IPearlmit _pearlmit
    ) BaseLeverageExecutor(_swapper, _cluster, _weth, _pearlmit) {
        glpManager = IGmxGlpManager(_glpRewardRouter.glpManager());
        glpRewardRouter = _glpRewardRouter;
    }

    function artifactGeneration(SGlpLeverageSwapData memory _var) external {
        //do nothing
    }

    // ********************** //
    // *** OWNER METHODS *** //
    // ********************** //
    /**
     * @notice Un/Pauses this contract.
     */
    function setPause(bool _pauseState) external {
        if (!cluster.hasRole(msg.sender, keccak256("PAUSABLE")) && msg.sender != owner()) revert NotAuthorized();
        if (_pauseState) {
            _pause();
        } else {
            _unpause();
        }
    }

    // ********************** //
    // *** PUBLIC METHODS *** //
    // ********************** //

    /**
     * @dev USDO > SGlpLeverageSwapData.token > wrap to tsGLP
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false. Does the unwrapping internally.
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false. Does the wrapping internally.
     * @dev SGlpLeverageSwapData.minAmountOut represents the min amount of GLP.
     *
     * @inheritdoc BaseLeverageExecutor
     */
    function getCollateral(
        address refundDustAddress,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        bytes calldata data
    ) external payable override whenNotPaused returns (uint256 collateralAmountOut) {
        if (msg.value > 0) revert NativeNotSupported();

        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();

        // Decode data
        SGlpLeverageSwapData memory glpSwapData = abi.decode(data, (SGlpLeverageSwapData));

        // Swap asset with `SGlpLeverageSwapData.token`
        uint256 tokenAmount = _swapAndTransferToSender(
            refundDustAddress, false, assetAddress, glpSwapData.token, assetAmountIn, abi.encode(glpSwapData.swapData)
        );

        // Swap `SGlpLeverageSwapData.token` with GLP
        collateralAmountOut = _buyGlp(glpSwapData.token, tokenAmount, glpSwapData.minAmountOut);

        // Wrap into tsGLP to sender
        address sGLP = ITOFT(collateralAddress).erc20();
        pearlmit.approve(20, sGLP, 0, collateralAddress, collateralAmountOut.toUint200(), block.timestamp.toUint48());

        sGLP.safeApprove(address(pearlmit), collateralAmountOut);
        collateralAmountOut = ITOFT(collateralAddress).wrap(address(this), address(this), collateralAmountOut);
        IERC20(collateralAddress).safeTransfer(msg.sender, collateralAmountOut);
        sGLP.safeApprove(address(pearlmit), 0);

        pearlmit.clearAllowance(address(this), 20, sGLP, 0);
    }

    /**
     * @dev unwrap tsGLP > SGlpLeverageSwapData.token > USDO
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false. Does the unwrapping internally.
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false. Does the wrapping internally.
     * @dev SGlpLeverageSwapData.minAmountOut represents the min amount of `SGlpLeverageSwapData.token`.
     *
     * @inheritdoc BaseLeverageExecutor
     */
    function getAsset(
        address refundDustAddress,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        bytes calldata data
    ) external override whenNotPaused returns (uint256 assetAmountOut) {
        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();

        // Decode data
        SGlpLeverageSwapData memory tokenSwapData = abi.decode(data, (SGlpLeverageSwapData));

        // Unwrap tsGLP
        uint256 unwrapped = ITOFT(collateralAddress).unwrap(address(this), collateralAmountIn);

        // Swap GLP with `SGlpLeverageSwapData.token`
        address sGLP = ITOFT(collateralAddress).erc20();
        uint256 tokenAmount = _sellGlp(tokenSwapData.token, tokenSwapData.minAmountOut, sGLP, unwrapped);

        // Swap `SGlpLeverageSwapData.token` with asset.
        // If sendBack true and swapData.swapperData.toftInfo.isTokenOutToft false
        // The asset will be transfer via IERC20 transfer.
        assetAmountOut = _swapAndTransferToSender(
            refundDustAddress, true, tokenSwapData.token, assetAddress, tokenAmount, abi.encode(tokenSwapData.swapData)
        );
    }

    // ********************** //
    // *** PRIVATE METHODS *** //
    // ********************** //

    /**
     * @dev Buys GLP with a chosen `token`. The `token` is chosen off-chain and is computed to be the best to buy GLP with,
     * for swapping USDO to the `token`.
     *
     * @param token Token to swap for GLP
     * @param tokenAmount Amount of `token` to swap for GLP
     * @param minGlpAmountOut Min amount of GLP to receive
     *
     * @return glpAmount Amount of GLP received
     */
    function _buyGlp(address token, uint256 tokenAmount, uint256 minGlpAmountOut) private returns (uint256 glpAmount) {
        token.safeApprove(address(glpManager), tokenAmount);
        glpAmount = glpRewardRouter.mintAndStakeGlp(token, tokenAmount, 0, minGlpAmountOut);
        token.safeApprove(address(glpManager), 0);

        if (glpAmount < minGlpAmountOut) revert NotEnough(minGlpAmountOut, glpAmount);
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
        sGLP.safeApprove(address(glpManager), glpAmount);
        tokenAmount = glpRewardRouter.unstakeAndRedeemGlp(token, glpAmount, minTokenAmountOut, address(this));
        sGLP.safeApprove(address(glpManager), 0);
        if (tokenAmount < minTokenAmountOut) revert NotEnough(minTokenAmountOut, tokenAmount);
    }
}
