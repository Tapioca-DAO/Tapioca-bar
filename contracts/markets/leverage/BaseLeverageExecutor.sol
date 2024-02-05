// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {BoringOwnable} from "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";

// Tapioca
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";
import {ISwapper} from "tapioca-periph/interfaces/periph/ISwapper.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";

abstract contract BaseLeverageExecutor is BoringOwnable {
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error SwapperNotValid();
    error SwapperNotAuthorized();

    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice returns YieldBox address
    IYieldBox public immutable yieldBox;

    /// @notice returns ICluster address
    ICluster public cluster;

    /// @notice returns ISwapper address
    ISwapper public swapper;

    constructor(IYieldBox _yb, ISwapper _swapper, ICluster _cluster) {
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
    function buildSwapDefaultData(address tokenIn, address tokenOut, uint256 amountIn)
        external
        view
        returns (bytes memory)
    {
        return _buildDefaultData(tokenIn, tokenOut, amountIn, "0x");
    }

    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address from,
        bytes calldata data
    ) external payable virtual returns (uint256 collateralAmountOut);

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
    function _buildDefaultData(address tokenIn, address tokenOut, uint256 amountIn, bytes memory dexData)
        internal
        view
        returns (bytes memory)
    {
        ISwapper.SwapData memory swapData = swapper.buildSwapData(tokenIn, tokenOut, amountIn, 0);
        uint256 minAmount = swapper.getOutputAmount(swapData, dexData);
        return abi.encode(minAmount, dexData);
    }

    function _swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes memory dexData,
        uint256 gas
    ) internal returns (uint256 amountOut) {
        ISwapper.SwapData memory swapData = swapper.buildSwapData(tokenIn, tokenOut, amountIn, 0);

        if (tokenIn != address(0)) {
            tokenIn.safeApprove(address(swapper), amountIn);
        }
        (amountOut,) = swapper.swap{value: gas}(swapData, minAmountOut, address(this), dexData);
    }

    function _assureSwapperValidity() internal view {
        if (address(swapper) == address(0)) revert SwapperNotValid();
        if (!cluster.isWhitelisted(0, address(swapper))) {
            revert SwapperNotAuthorized();
        }
    }

    function _ybDeposit(uint256 id, address token, address from, address to, uint256 amount) internal virtual {
        token.safeApprove(address(yieldBox), amount);
        yieldBox.depositAsset(id, from, to, amount, 0);
    }
}
