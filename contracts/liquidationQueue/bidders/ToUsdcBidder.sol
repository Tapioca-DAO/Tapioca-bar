// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

import '../ILiquidationQueue.sol';
import '../../mixologist/Mixologist.sol';
import '../../swappers/MultiSwapper.sol';
import '../../swappers/CurveSwapper.sol';

import './IUsdoBidder.sol';

/// @notice Swaps USD0 to USDC
/// @dev Performs 2 swap operations:
///     - USD0 to WETH through Curve
///     - WETH to USDC through Uniswap
contract ToUsdcBidder is IUsdoBidder, BoringOwnable {
    // ************ //
    // *** DATA *** //
    // ************ //

    /// @notice returns the mixologist address
    Mixologist public mixologist;
    /// @notice UniswapV2 swapper
    MultiSwapper public univ2Swapper;
    /// @notice Curve pool swapper
    CurveSwapper public curveSwapper;

    YieldBox yieldBox;
    ILiquidationQueue liquidationQueue;

    uint256 wethAssetId;
    uint256 usdcAssetId;

    uint256 _curveUsdoIndex;
    uint256 _curveWethIndex;

    event CurveSwapperUpdated(address indexed _old, address indexed _new);
    event UniV2SwapperUpdated(address indexed _old, address indexed _new);

    constructor(
        MultiSwapper uniV2Swapper_,
        CurveSwapper curveSwapper_,
        Mixologist mixologist_,
        uint256 curveUsd0Index_,
        uint256 curveWethIndex_,
        uint256 wethAssetId_
    ) {
        univ2Swapper = uniV2Swapper_;
        curveSwapper = curveSwapper_;

        mixologist = mixologist_;
        yieldBox = mixologist_.yieldBox();
        liquidationQueue = mixologist.liquidationQueue();

        wethAssetId = wethAssetId_;
        usdcAssetId = mixologist.collateralId();

        _curveUsdoIndex = curveUsd0Index_;
        _curveWethIndex = curveWethIndex_;
    }

    // ************ //
    // *** METHODS *** //
    // ************ //
    // --- View methods ---
    /// @notice returns the unique name
    function name() external pure returns (string memory) {
        return 'USD0 -> WETH (Curve) / WETH -> USDC (Uniswap V2)';
    }

    /// @notice returns the amount of collateral
    /// @param amountIn USD0 amount
    function getOutputAmount(uint256 amountIn, bytes calldata)
        external
        view
        returns (uint256)
    {
        //USD0->WETH
        uint256 usdoAssetId = mixologist.beachBar().usdoAssetId();
        uint256 usdoShareIn = yieldBox.toShare(usdoAssetId, amountIn, false);
        uint256[] memory indexes = new uint256[](2);
        indexes[0] = _curveUsdoIndex;
        indexes[1] = _curveWethIndex;
        uint256 wethOutAmount = curveSwapper.getOutputAmount(
            usdoAssetId,
            indexes,
            usdoShareIn
        );

        //WETH->USDC
        uint256 collateralAssetId = mixologist.collateralId();
        (, address wethAdress, , ) = yieldBox.assets(wethAssetId);
        (, address collateralAddress, , ) = yieldBox.assets(collateralAssetId);
        address[] memory uniV2SwapPath = new address[](2);
        uniV2SwapPath[0] = wethAdress;
        uniV2SwapPath[1] = collateralAddress;
        uint256 wethOutShare = yieldBox.toShare(
            wethAssetId,
            wethOutAmount,
            false
        );
        return
            univ2Swapper.getOutputAmount(
                wethAssetId,
                uniV2SwapPath,
                wethOutShare
            );
    }

    // --- Write methods ---
    /// @notice swap USD0 to collateral
    /// @param bidder the sender to swap it from
    /// @param usdoAmount USD0 amount
    /// @param data extra data used for the swap operation
    function swap(
        address bidder,
        uint256 usdoAmount,
        bytes calldata data
    ) external returns (uint256) {
        require(msg.sender == address(liquidationQueue), 'only LQ');

        uint256 usdoAssetId = mixologist.beachBar().usdoAssetId();

        //USD0->WETH; TODO: check if we want to do it directly without the yieldbox deposit
        uint256 usdoShare = yieldBox.toShare(usdoAssetId, usdoAmount, false);
        yieldBox.transfer(
            bidder,
            address(curveSwapper),
            usdoAssetId,
            usdoShare
        );

        (uint256 wethMinAmount, uint256 usdcMinAmount) = abi.decode(
            data,
            (uint256, uint256)
        );

        uint256 wethAmount = _swapThroughCurve(
            usdoAssetId,
            usdoShare,
            wethMinAmount,
            address(univ2Swapper)
        );

        //WETH->USDC
        uint256 wethShare = yieldBox.toShare(wethAssetId, wethAmount, false);
        uint256 liquidatedAssetAmount = _swapThroughUniswap(
            wethShare,
            usdcMinAmount
        );
        return liquidatedAssetAmount;
    }

    // --- Owner methods ---

    /// @notice sets the Curve swapper
    /// @dev used for USD0 to WETH swap
    /// @param _swapper The curve pool swapper address
    function setCurveSwapper(CurveSwapper _swapper) external onlyOwner {
        emit CurveSwapperUpdated(address(curveSwapper), address(_swapper));
        curveSwapper = _swapper;
    }

    /// @notice sets the UniV2 swapper
    /// @dev used for WETH to USDC swap
    /// @param _swapper The UniV2 pool swapper address
    function setUniswapSwapper(MultiSwapper _swapper) external onlyOwner {
        emit UniV2SwapperUpdated(address(univ2Swapper), address(_swapper));
        univ2Swapper = _swapper;
    }

    // --- Private methods ---
    function _swapThroughCurve(
        uint256 usdoAssetId,
        uint256 shareIn,
        uint256 amountOutMin,
        address to
    ) private returns (uint256) {
        uint256[] memory indexes = new uint256[](2);
        indexes[0] = _curveUsdoIndex;
        indexes[1] = _curveWethIndex;
        (, uint256 shareOut) = curveSwapper.swap(
            usdoAssetId,
            wethAssetId,
            indexes,
            shareIn,
            amountOutMin,
            address(this)
        );

        yieldBox.transfer(address(this), to, wethAssetId, shareOut);
        return yieldBox.toAmount(wethAssetId, shareOut, false);
    }

    function _swapThroughUniswap(uint256 wethShare, uint256 liquidatedMinAmount)
        private
        returns (uint256)
    {
        (, address wethAddress, , ) = yieldBox.assets(wethAssetId);
        (, address collateralAddress, , ) = yieldBox.assets(usdcAssetId);

        address[] memory uniV2SwapPath = new address[](2);
        uniV2SwapPath[0] = wethAddress;
        uniV2SwapPath[1] = collateralAddress;

        (uint256 liquidatedAssetAmount, ) = univ2Swapper.swap(
            wethAssetId,
            usdcAssetId,
            liquidatedMinAmount,
            address(liquidationQueue),
            uniV2SwapPath,
            wethShare
        );

        return liquidatedAssetAmount;
    }
}
