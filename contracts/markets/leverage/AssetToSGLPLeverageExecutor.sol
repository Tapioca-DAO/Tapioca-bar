// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ITapiocaOFTBase} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/IGmxGlpManager.sol";
import "tapioca-periph/contracts/interfaces/IGmxRewardRouterV2.sol";

import "./BaseLeverageExecutor.sol";

contract AssetToSGLPLeverageExecutor is BaseLeverageExecutor {
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
    /// @dev USDO > USDC > GLP > wrap to tGLP
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress tGLP address (TOFT GLP)
    /// @param assetAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetToSGLPLeverageExecutor data
    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address from,
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

        //get GLP address
        address glpAddress = ITapiocaOFTBase(collateralAddress).erc20();
        if (glpAddress == address(0)) revert GlpNotValid();

        //swap USDC with GLP
        collateralAmountOut = _buyGlp(
            usdcAmount,
            address(usdc),
            minGlpAmountOut
        );
        if (collateralAmountOut < minGlpAmountOut) revert NotEnough(glpAddress);

        //wrap into tGLP
        IERC20(glpAddress).approve(collateralAddress, 0);
        IERC20(glpAddress).approve(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(
            address(this),
            address(this),
            collateralAmountOut
        );

        //deposit tGLP to YieldBox
        IERC20(collateralAddress).approve(address(yieldBox), 0);
        IERC20(collateralAddress).approve(
            address(yieldBox),
            collateralAmountOut
        );
        yieldBox.depositAsset(
            collateralId,
            address(this),
            from,
            collateralAmountOut,
            0
        );
    }

    /// @notice buys asset with collateral
    /// @dev unwrap tGLP > GLP > USDC > USDO
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress tGLP address (TOFT GLP)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetToSGLPLeverageExecutor data
    function getAsset(
        uint256 assetId,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        address from,
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

        address glpAddress = ITapiocaOFTBase(collateralAddress).erc20();
        if (glpAddress == address(0)) revert TokenNotValid();

        ITapiocaOFTBase(collateralAddress).unwrap(
            address(this),
            collateralAmountIn
        );

        //swap GLP with USDC
        uint256 usdcAmount = _sellGlp(
            collateralAmountIn,
            glpAddress,
            address(usdc),
            minUsdcAmountOut
        );
        if (usdcAmount < minUsdcAmountOut) revert NotEnough(address(usdc));

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

        IERC20(assetAddress).approve(address(yieldBox), 0);
        IERC20(assetAddress).approve(address(yieldBox), assetAmountOut);
        yieldBox.depositAsset(assetId, address(this), from, assetAmountOut, 0);
    }

    // ********************** //
    // *** PRIVATE MEHODS *** //
    // ********************** //
    function _buyGlp(
        uint256 usdcAmount,
        address usdcAddress,
        uint256 minGlpAmountOut
    ) private returns (uint256 glpAmount) {
        IERC20(usdcAddress).approve(address(glpManager), 0);
        IERC20(usdcAddress).approve(address(glpManager), usdcAmount);
        glpAmount = glpRewardRouter.mintAndStakeGlp(
            usdcAddress,
            usdcAmount,
            0,
            minGlpAmountOut
        );
    }

    function _sellGlp(
        uint256 glpAmount,
        address glpAddress,
        address usdcAddress,
        uint256 minUsdcAmountOut
    ) private returns (uint256 usdcAmount) {
        IERC20(glpAddress).approve(address(glpManager), 0);
        IERC20(glpAddress).approve(address(glpManager), glpAmount);
        usdcAmount = glpRewardRouter.unstakeAndRedeemGlp(
            usdcAddress,
            glpAmount,
            minUsdcAmountOut,
            address(this)
        );
    }
}
