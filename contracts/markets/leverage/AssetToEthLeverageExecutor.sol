// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ITapiocaOFTBase} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";

import "./BaseLeverageExecutor.sol";

contract AssetToEthLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error SenderNotValid();
    error TokenNotValid();
    error NotEnough();

    constructor(
        YieldBox _yb,
        ISwapper _swapper,
        ICluster _cluster
    ) BaseLeverageExecutor(_yb, _swapper, _cluster) {}

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    /// @notice buys collateral with asset
    /// @dev USDO > ETH > wrap to tETH
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress tETH address (TOFT ETH)
    /// @param assetAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetToEthLeverageExecutor data
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
        (uint256 minETh, bytes memory dexEthData) = abi.decode(
            data,
            (uint256, bytes)
        );

        //verify ETH
        address eth = ITapiocaOFTBase(collateralAddress).erc20();
        if (eth != address(0)) revert TokenNotValid();

        //swap Asset with ETH
        collateralAmountOut = _swapTokens(
            assetAddress,
            address(0),
            assetAmountIn,
            minETh,
            dexEthData,
            0
        );

        if (collateralAmountOut < minETh) revert NotEnough();

        //wrap and transfer to user
        ITapiocaOFTBase(collateralAddress).wrap{value: collateralAmountOut}(
            address(this),
            address(this),
            collateralAmountOut
        );
        _ybDeposit(
            collateralId,
            collateralAddress,
            address(this),
            to,
            collateralAmountOut
        );
    }

    /// @notice buys asset with collateral
    /// @dev unwrap tETH > ETH > USDO
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress tETH address (TOFT ETH)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetToEthLeverageExecutor data
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
        (uint256 minAssetAmount, bytes memory dexAssetData) = abi.decode(
            data,
            (uint256, bytes)
        );

        //verify ETH
        address eth = ITapiocaOFTBase(collateralAddress).erc20();
        if (eth != address(0)) revert TokenNotValid();

        ITapiocaOFTBase(collateralAddress).unwrap(
            address(this),
            collateralAmountIn
        );

        //swap ETH with Asset
        assetAmountOut = _swapTokens(
            address(0),
            assetAddress,
            collateralAmountIn,
            minAssetAmount,
            dexAssetData,
            collateralAmountIn
        );
        if (assetAmountOut < minAssetAmount) revert NotEnough();

        _ybDeposit(assetId, assetAddress, address(this), to, assetAmountOut);
    }

    receive() external payable {}
}
