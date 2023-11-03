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

abstract contract BaseLeverageExecutor is BoringOwnable {
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
    /// @notice returns getCollateral or getAsset for Asset > DAI or DAI > Asset respectively default data parameter
    /// @param tokenIn token in address
    /// @param tokenOut token out address
    /// @param amountIn amount to get the minimum for
    function buildSwapDefaultData(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (bytes memory) {
        return _buildDefaultData(tokenIn, tokenOut, amountIn, "0x");
    }

    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address from,
        bytes calldata data
    ) external virtual returns (uint256 collateralAmountOut);

    function getAsset(
        uint256 assetId,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        address from,
        bytes calldata data
    ) external virtual returns (uint256 assetAmountOut);

    // *********************** //
    // *** INTERNAL MEHODS *** //
    // *********************** //
    function _buildDefaultData(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory dexData
    ) internal view returns (bytes memory) {
        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            false,
            false
        );
        uint256 minAmount = swapper.getOutputAmount(swapData, dexData);
        return abi.encode(minAmount, dexData);
    }

    function _swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes memory dexData
    ) internal returns (uint256 amountOut) {
        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            false,
            false
        );

        if (tokenIn != address(0)) {
            IERC20(tokenIn).approve(address(swapper), 0);
            IERC20(tokenIn).approve(address(swapper), amountIn);
        }
        (amountOut, ) = swapper.swap{value: msg.value}(
            swapData,
            minAmountOut,
            address(this),
            dexData
        );
    }

    function _assureSwapperValidity() internal view {
        require(
            address(swapper) != address(0),
            "LeverageExecutor: swapper not valid"
        );
        require(
            cluster.isWhitelisted(0, address(swapper)),
            "LeverageExecutor: swapper not authorized"
        );
    }
}
