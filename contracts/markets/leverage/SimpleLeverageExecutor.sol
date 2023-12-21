// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BaseLeverageExecutor.sol";

contract SimpleLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error SenderNotValid();
    error TokenNotValid();
    error NotEnough(address token);

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
        address to,
        bytes calldata data
    ) external payable override returns (uint256 collateralAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
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
            dexData,
            0
        );
        if (collateralAmountOut < minAmountOut)
            revert NotEnough(collateralAddress);

        _ybDeposit(
            collateralId,
            collateralAddress,
            address(this),
            to,
            collateralAmountOut
        );
    }

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

        (uint256 minAmountOut, bytes memory dexData) = abi.decode(
            data,
            (uint256, bytes)
        );

        assetAmountOut = _swapTokens(
            collateralAddress,
            assetAddress,
            collateralAmountIn,
            minAmountOut,
            dexData,
            0
        );
        if (assetAmountOut < minAmountOut) revert NotEnough(assetAddress);

        _ybDeposit(assetId, assetAddress, address(this), to, assetAmountOut);
    }
}
