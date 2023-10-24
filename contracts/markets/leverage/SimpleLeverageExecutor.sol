// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//@boringcrypto
import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";

//tapioca-sdk
import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";

//tapioca-periph
import "tapioca-periph/contracts/interfaces/ISwapper.sol";
import "tapioca-periph/contracts/interfaces/ICluster.sol";
import "tapioca-periph/contracts/interfaces/ILeverageExecutor.sol";

contract SimpleLeverageExecutor is BoringOwnable {
    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice returns YieldBox address
    YieldBox public immutable yieldBox;

    /// @notice returns ICluster address
    ICluster public cluster;

    /// @notice returns ISwapper address
    ISwapper public swapper;

    constructor(YieldBox _yb, ISwapper _swapper, ICluster _cluster) {
        yieldBox = _yb;
        swapper = _swapper;
        cluster = _cluster;

        owner = msg.sender;
    }

    // ******************** //
    // *** OWNER MEHODS *** //
    // ******************** //
    /// @notice sets swapper
    /// @param _swapper the new ISwapper
    function setSwapper(ISwapper _swapper) external onlyOwner {
        swapper = _swapper;
    }

    /// @notice sets cluster
    /// @param _cluster the new ICluster
    function setCluster(ICluster _cluster) external onlyOwner {
        cluster = _cluster;
    }

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    function getCollateral(
        uint256 assetId,
        uint256 collateralId,
        uint256 assetShareIn,
        address from,
        bytes calldata data
    ) external returns (uint256 collateralAmountOut) {
        require(
            address(swapper) != address(0),
            "LeverageExecutor: swapper not valid"
        );
        require(
            cluster.isWhitelisted(0, address(swapper)),
            "LeverageExecutor: swapper not authorized"
        );

        (uint256 minAmountOut, bytes memory dexData) = abi.decode(
            data,
            (uint256, bytes)
        );
        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            assetId,
            collateralId,
            0,
            assetShareIn,
            true,
            true
        );

        (collateralAmountOut, ) = swapper.swap(
            swapData,
            minAmountOut,
            from,
            dexData
        );
        require(
            collateralAmountOut >= minAmountOut,
            "LeverageExecutor: not enough"
        );
    }

    function getAsset(
        uint256 assetId,
        uint256 collateralId,
        uint256 collateralShareIn,
        address from,
        bytes calldata data
    ) external returns (uint256 assetAmountOut) {
        require(
            address(swapper) != address(0),
            "LeverageExecutor: swapper not valid"
        );
        require(
            cluster.isWhitelisted(0, address(swapper)),
            "LeverageExecutor: swapper not authorized"
        );

        (uint256 minAmountOut, bytes memory dexData) = abi.decode(
            data,
            (uint256, bytes)
        );
        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            collateralId,
            assetId,
            0,
            collateralShareIn,
            true,
            true
        );

        (assetAmountOut, ) = swapper.swap(
            swapData,
            minAmountOut,
            from,
            dexData
        );
        require(assetAmountOut >= minAmountOut, "LeverageExecutor: not enough");
    }
}
