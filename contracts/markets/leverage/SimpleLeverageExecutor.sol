// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BaseLeverageExecutor.sol";

contract SimpleLeverageExecutor is BaseLeverageExecutor {
    constructor(
        YieldBox _yb,
        ISwapper _swapper,
        ICluster _cluster
    ) BaseLeverageExecutor(_yb, _swapper, _cluster) {}

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address from,
        bytes calldata data
    ) external override returns (uint256 collateralAmountOut) {
        _assureSwapperValidity();

        (uint256 minAmountOut, bytes memory dexData) = abi.decode(
            data,
            (uint256, bytes)
        );

        collateralAmountOut = _swapTokens(
            assetAddress,
            collateralAddress,
            assetAmountIn,
            minAmountOut,
            dexData
        );
        require(
            collateralAmountOut >= minAmountOut,
            "LeverageExecutor: not enough"
        );

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

    function getAsset(
        uint256 assetId,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        address from,
        bytes calldata data
    ) external override returns (uint256 assetAmountOut) {
        _assureSwapperValidity();

        (uint256 minAmountOut, bytes memory dexData) = abi.decode(
            data,
            (uint256, bytes)
        );

        assetAmountOut = _swapTokens(
            collateralAddress,
            assetAddress,
            collateralAmountIn,
            minAmountOut,
            dexData
        );
        require(assetAmountOut >= minAmountOut, "LeverageExecutor: not enough");

        IERC20(assetAddress).approve(address(yieldBox), 0);
        IERC20(assetAddress).approve(address(yieldBox), assetAmountOut);
        yieldBox.depositAsset(assetId, address(this), from, assetAmountOut, 0);
    }
}
