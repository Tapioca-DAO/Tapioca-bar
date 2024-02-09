// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {IGmxRewardRouterV2} from "tapioca-periph/interfaces/external/gmx/IGmxRewardRouterV2.sol";
import {IGmxGlpManager} from "tapioca-periph/interfaces/external/gmx/IGmxGlpManager.sol";
import {ITapiocaOFTBase} from "tapioca-periph/interfaces/tap-token/ITapiocaOFT.sol";
import {BaseLeverageExecutor, SLeverageSwapData} from "./BaseLeverageExecutor.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";

/*
__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__

*/

struct SGlpLeverageSwapData {
    SLeverageSwapData swapData;
    uint256 minAmountOut;
}

// TODO Revisit this contract, should check used of sGLP/fsGLP contract
contract AssetToSGLPLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

    IERC20 public immutable usdc;

    IGmxGlpManager private immutable glpManager;
    IGmxRewardRouterV2 private immutable glpRewardRouter;

    // ************** //
    // *** ERRORS *** //
    // ************** //

    error GlpNotValid();

    constructor(IZeroXSwapper _swapper, ICluster _cluster, IERC20 _usdc, IGmxRewardRouterV2 _glpRewardRouter)
        BaseLeverageExecutor(_swapper, _cluster)
    {
        glpManager = IGmxGlpManager(_glpRewardRouter.glpManager());
        glpRewardRouter = _glpRewardRouter;
        usdc = _usdc;
    }

    // ********************* //
    // *** PUBLIC METHODS *** //
    // ********************* //

    /**
     * @dev USDO > USDC > tsGLP
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false
     * @inheritdoc BaseLeverageExecutor
     */
    function getCollateral(address assetAddress, address collateralAddress, uint256 assetAmountIn, bytes calldata data)
        external
        payable
        override
        returns (uint256 collateralAmountOut)
    {
        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();

        // Decode data
        SGlpLeverageSwapData memory glpSwapData = abi.decode(data, (SGlpLeverageSwapData));

        // Swap asset with USDC
        uint256 usdcAmount = _swapAndTransferToSender(
            false, assetAddress, address(usdc), assetAmountIn, glpSwapData.swapData.swapperData
        );

        // Swap USDC with GLP
        collateralAmountOut = _buyGlp(usdcAmount, address(usdc), glpSwapData.minAmountOut, collateralAddress);

        // Wrap into tsGLP to sender
        address(usdc).safeApprove(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(address(this), msg.sender, collateralAmountOut);
        address(usdc).safeApprove(collateralAddress, 0);
    }

    /**
     * @dev tsGLP > USDC > USDO
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false
     * @inheritdoc BaseLeverageExecutor
     */
    function getAsset(address collateralAddress, address assetAddress, uint256 collateralAmountIn, bytes calldata data)
        external
        override
        returns (uint256 assetAmountOut)
    {
        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();

        // Decode data
        SGlpLeverageSwapData memory usdcSwapData = abi.decode(data, (SGlpLeverageSwapData));

        // Unwrap tsGLP
        ITapiocaOFTBase(collateralAddress).unwrap(address(this), collateralAmountIn);

        // Swap GLP with USDC
        // TODO collateralAddress is wrong, should be fsGLP
        uint256 usdcAmount = _sellGlp(collateralAmountIn, collateralAddress, address(usdc), usdcSwapData.minAmountOut);

        // Swap USDC with Asset
        assetAmountOut =
            _swapAndTransferToSender(false, address(usdc), assetAddress, usdcAmount, usdcSwapData.swapData.swapperData);
    }

    // ********************** //
    // *** PRIVATE METHODS *** //
    // ********************** //
    function _buyGlp(uint256 usdcAmount, address usdcAddress, uint256 minGlpAmountOut, address glpAddress)
        private
        returns (uint256 glpAmount)
    {
        usdcAddress.safeApprove(address(glpManager), usdcAmount);
        glpAmount = glpRewardRouter.mintAndStakeGlp(usdcAddress, usdcAmount, 0, minGlpAmountOut);

        if (glpAmount < minGlpAmountOut) revert NotEnough(glpAddress);
    }

    function _sellGlp(uint256 glpAmount, address glpAddress, address usdcAddress, uint256 minUsdcAmountOut)
        private
        returns (uint256 usdcAmount)
    {
        glpAddress.safeApprove(address(glpManager), glpAmount);
        usdcAmount = glpRewardRouter.unstakeAndRedeemGlp(usdcAddress, glpAmount, minUsdcAmountOut, address(this));
        if (usdcAmount < minUsdcAmountOut) revert NotEnough(usdcAddress);
    }
}
