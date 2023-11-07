// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ITapiocaOFTBase} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/ISavingsDai.sol";

import "./BaseLeverageExecutor.sol";

contract AssetTotsDaiLeverageExecutor is BaseLeverageExecutor {
    constructor(
        YieldBox _yb,
        ISwapper _swapper,
        ICluster _cluster
    ) BaseLeverageExecutor(_yb, _swapper, _cluster) {}

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    /// @notice buys collateral with asset
    /// @dev USDO > DAI > sDAi > wrap to tsDai
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress tsDai address (TOFT sDAI)
    /// @param assetAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetTotsDaiLeverageExecutor data
    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address from,
        bytes calldata data
    ) external payable override returns (uint256 collateralAmountOut) {
        require(
            cluster.isWhitelisted(0, msg.sender),
            "LeverageExecutor: sender not valid"
        );
        _assureSwapperValidity();
        (uint256 minAmountOut, bytes memory dexData) = abi.decode(
            data,
            (uint256, bytes)
        );

        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(
            collateralAddress
        );

        //swap USDO (asset) with DAI
        uint256 daiAmount = _swapTokens(
            assetAddress,
            daiAddress,
            assetAmountIn,
            minAmountOut,
            dexData,
            0
        );
        require(
            daiAmount >= minAmountOut,
            "AssetTotsDaiLeverageExecutor: not enough"
        );

        //obtain sDai
        IERC20(daiAddress).approve(sDaiAddress, 0);
        IERC20(daiAddress).approve(sDaiAddress, daiAmount);
        collateralAmountOut = ISavingsDai(sDaiAddress).deposit(
            daiAmount,
            address(this)
        );

        //wrap into tsDai
        IERC20(sDaiAddress).approve(collateralAddress, 0);
        IERC20(sDaiAddress).approve(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(
            address(this),
            address(this),
            collateralAmountOut
        );

        //deposit tsDai to YieldBox
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
    /// @dev unwrap tsDai > withdraw sDai > Dai > USDO
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress tsDai address (TOFT sDAI)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetTotsDaiLeverageExecutor data
    function getAsset(
        uint256 assetId,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        address from,
        bytes calldata data
    ) external override returns (uint256 assetAmountOut) {
        require(
            cluster.isWhitelisted(0, msg.sender),
            "LeverageExecutor: sender not valid"
        );
        _assureSwapperValidity();
        (uint256 minAmountOut, bytes memory dexData) = abi.decode(
            data,
            (uint256, bytes)
        );

        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(
            collateralAddress
        );

        //unwrap tsDai
        ITapiocaOFTBase(collateralAddress).unwrap(
            address(this),
            collateralAmountIn
        );

        //redeem from sDai
        uint256 shares = ISavingsDai(sDaiAddress).convertToShares(
            collateralAmountIn
        );
        uint256 obtainedDai = ISavingsDai(sDaiAddress).redeem(
            shares,
            address(this),
            address(this)
        );

        assetAmountOut = _swapTokens(
            daiAddress,
            assetAddress,
            obtainedDai,
            minAmountOut,
            dexData,
            0
        );
        require(
            assetAmountOut >= minAmountOut,
            "AssetTotsDaiLeverageExecutor: not enough"
        );

        IERC20(assetAddress).approve(address(yieldBox), 0);
        IERC20(assetAddress).approve(address(yieldBox), assetAmountOut);
        yieldBox.depositAsset(assetId, address(this), from, assetAmountOut, 0);
    }

    // ********************** //
    // *** PRIVATE MEHODS *** //
    // ********************** //
    function _getAddresses(
        address collateralAddress
    ) private view returns (address sDaiAddress, address daiAddress) {
        //retrieve sDAI address from tsDai
        sDaiAddress = ITapiocaOFTBase(collateralAddress).erc20();
        require(
            sDaiAddress != address(0),
            "AssetTotsDaiLeverageExecutor: sDAI not valid"
        );

        //retrieve DAI address from sDAI
        daiAddress = ISavingsDai(sDaiAddress).dai();
    }
}
