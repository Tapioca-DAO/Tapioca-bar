// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ITapiocaOFTBase} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/IGmxGlpManager.sol";
import "tapioca-periph/contracts/interfaces/IGmxRewardRouterV2.sol";

import "./BaseLeverageExecutor.sol";

contract AssetToSGLPLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;
    IERC20 public immutable usdc;

    IGmxGlpManager private immutable glpManager;
    IGmxRewardRouterV2 private immutable glpRewardRouter;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error SenderNotValid();
    error TokenNotValid();
    error NotEnough(address token);
    error GlpNotValid();

    constructor(
        YieldBox _yb,
        ISwapper _swapper,
        ICluster _cluster,
        IERC20 _usdc,
        IGmxRewardRouterV2 _glpRewardRouter
    ) BaseLeverageExecutor(_yb, _swapper, _cluster) {
        usdc = _usdc;
        glpRewardRouter = _glpRewardRouter;
        glpManager = IGmxGlpManager(glpRewardRouter.glpManager());
    }

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    /// @notice buys collateral with asset
    /// @dev USDO > USDC > GLP
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress GLP address
    /// @param assetAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetToSGLPLeverageExecutor data
    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address to,
        bytes calldata data
    ) external payable override returns (uint256 collateralAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        _assureSwapperValidity();

        //decode data
        (
            uint256 minUsdcAmountOut,
            bytes memory dexUsdcData,
            uint256 minGlpAmountOut
        ) = abi.decode(data, (uint256, bytes, uint256));

        //swap asset with USDC
        uint256 usdcAmount = _swapTokens(
            assetAddress,
            address(usdc),
            assetAmountIn,
            minUsdcAmountOut,
            dexUsdcData,
            0
        );
        if (usdcAmount < minUsdcAmountOut) revert NotEnough(address(usdc));

        //swap USDC with GLP
        collateralAmountOut = _buyGlp(
            usdcAmount,
            address(usdc),
            minGlpAmountOut,
            collateralAddress
        );

        //deposit GLP to YieldBox
        _ybDeposit(
            collateralId,
            collateralAddress,
            address(this),
            to,
            collateralAmountOut
        );
    }

    /// @notice buys asset with collateral
    /// @dev GLP > USDC > USDO
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress GLP address
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetToSGLPLeverageExecutor data
    function getAsset(
        uint256 assetId,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        address to,
        bytes calldata data
    ) external override returns (uint256 assetAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        _assureSwapperValidity();

        //decode data
        (
            uint256 minUsdcAmountOut,
            uint256 minAssetAmountOut,
            bytes memory dexAssetData
        ) = abi.decode(data, (uint256, uint256, bytes));

        //swap GLP with USDC
        uint256 usdcAmount = _sellGlp(
            collateralAmountIn,
            collateralAddress,
            address(usdc),
            minUsdcAmountOut
        );

        //swap USDC with Asset
        assetAmountOut = _swapTokens(
            address(usdc),
            assetAddress,
            usdcAmount,
            minAssetAmountOut,
            dexAssetData,
            0
        );
        if (assetAmountOut < minAssetAmountOut) revert NotEnough(assetAddress);

        //deposit asset to YieldBox
        _ybDeposit(assetId, assetAddress, address(this), to, assetAmountOut);
    }

    // ********************** //
    // *** PRIVATE MEHODS *** //
    // ********************** //
    function _buyGlp(
        uint256 usdcAmount,
        address usdcAddress,
        uint256 minGlpAmountOut,
        address glpAddress
    ) private returns (uint256 glpAmount) {
        usdcAddress.safeApprove(address(glpManager), usdcAmount);
        glpAmount = glpRewardRouter.mintAndStakeGlp(
            usdcAddress,
            usdcAmount,
            0,
            minGlpAmountOut
        );

        if (glpAmount < minGlpAmountOut) revert NotEnough(glpAddress);
    }

    function _sellGlp(
        uint256 glpAmount,
        address glpAddress,
        address usdcAddress,
        uint256 minUsdcAmountOut
    ) private returns (uint256 usdcAmount) {
        glpAddress.safeApprove(address(glpManager), glpAmount);
        usdcAmount = glpRewardRouter.unstakeAndRedeemGlp(
            usdcAddress,
            glpAmount,
            minUsdcAmountOut,
            address(this)
        );
        if (usdcAmount < minUsdcAmountOut) revert NotEnough(usdcAddress);
    }

    function _ybDeposit(
        uint256 id,
        address token,
        address from,
        address to,
        uint256 amount
    ) private {
        token.safeApprove(address(yieldBox), amount);
        yieldBox.depositAsset(id, from, to, amount, 0);
    }
}
