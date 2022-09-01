// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

import '../ILiquidationQueue.sol';
import '../../mixologist/Mixologist.sol';
import '../../swappers/MultiSwapper.sol';
import '../../swappers/CurveSwapper.sol';

import './IStableBidder.sol';

/// @notice Swaps Stable to tAsset through UniswapV2
/// @dev Performs 2 swap operations:
///     - Stable to USD0 through 3crv+USD0 pool
///     - USD0 to tAsset through UniV2
contract UsdoHopBidder is IStableBidder, BoringOwnable {
    // ************ //
    // *** DATA *** //
    // ************ //

    // --- Public ---
    /// @notice UniswapV2 swapper
    MultiSwapper public univ2Swapper;
    /// @notice 3Crv+USD0 swapper
    CurveSwapper public curveSwapper;

    // --- Private ---
    Mixologist _mixologist;
    YieldBox _yieldBox;
    ILiquidationQueue _liquidationQueue;
    uint256 tAssetId;
    uint256 curveAssetsLength;

    // --- Events ---
    event CurveSwapperUpdated(address indexed _old, address indexed _new);
    event UniV2SwapperUpdated(address indexed _old, address indexed _new);

    constructor(
        MultiSwapper uniV2Swapper_,
        CurveSwapper curveSwapper_,
        Mixologist mixologist_,
        uint256 curvePoolAssetCount_
    ) {
        univ2Swapper = uniV2Swapper_;
        curveSwapper = curveSwapper_;

        _mixologist = mixologist_;
        _yieldBox = mixologist_.yieldBox();
        _liquidationQueue = mixologist_.liquidationQueue();

        curveAssetsLength = curvePoolAssetCount_;
        tAssetId = mixologist_.collateralId();
    }

    // ************ //
    // *** METHODS *** //
    // ************ //
    // --- View methods ---
    /// @notice returns the unique name
    function name() external pure returns (string memory) {
        return 'stable -> USD0 (3Crv+USD0) / USD0 -> tAsset (Uniswap V2)';
    }

    /// @notice returns the amount of collateral
    /// @param amountIn Stablecoin amount
    function getOutputAmount(
        uint256 stableAssetId,
        uint256 amountIn,
        bytes calldata
    ) external view returns (uint256) {
        require(
            address(_mixologist.beachBar().usdoToken()) != address(0),
            'LQ: USD0 not set'
        );
        uint256 usdoAssetId = _mixologist.beachBar().usdoAssetId();

        uint256 usdoAmount = amountIn;
        //Stable->USD0
        if (stableAssetId != usdoAssetId) {
            usdoAmount = _curveOutputAmount(
                stableAssetId,
                usdoAssetId,
                amountIn
            );
        }

        //USD0->tAsset
        return _uniswapOutputAmount(usdoAssetId, tAssetId, usdoAmount);
    }

    // --- Write methods ---
    /// @notice swaps stable to collateral
    /// @param bidder the sender to swap it from
    /// @param stableAssetId Stablecoin asset id
    /// @param amountIn Stablecoin amount
    /// @param data extra data used for the swap operation
    function swap(
        address bidder,
        uint256 stableAssetId,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256) {
        require(msg.sender == address(_liquidationQueue), 'only LQ');
        require(
            address(_mixologist.beachBar().usdoToken()) != address(0),
            'LQ: USD0 not set'
        );
        uint256 usdoAssetId = _mixologist.beachBar().usdoAssetId();

        uint256 _usdoMin = 0;
        uint256 _tAssetMin = 0;
        if (data.length > 0) {
            //should always be sent
            (_usdoMin, _tAssetMin) = abi.decode(data, (uint256, uint256));
        }

        uint256 stableShare = _yieldBox.toShare(stableAssetId, amountIn, false);
        uint256 usdoAmount = amountIn;
        //Stable->USD0
        if (stableAssetId != usdoAssetId) {
            _yieldBox.transfer(
                bidder,
                address(curveSwapper),
                stableAssetId,
                stableShare
            ); //TODO: check if we want to do it directly without the yieldbox deposit

            uint256 share = _curveSwap(
                stableAssetId,
                usdoAssetId,
                amountIn,
                _usdoMin
            );
            _yieldBox.transfer(
                address(this),
                address(univ2Swapper),
                usdoAssetId,
                share
            );
            usdoAmount = _yieldBox.toAmount(usdoAssetId, share, false);
        } else {
            _yieldBox.transfer(
                bidder,
                address(univ2Swapper),
                stableAssetId,
                stableShare
            ); //TODO: check if we want to do it directly without the yieldbox deposit
        }

        //USDO->tAsset
        uint256 liquidatedAmount = _uniswapSwap(
            usdoAssetId,
            tAssetId,
            usdoAmount,
            _tAssetMin
        );

        return liquidatedAmount;
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
    function _getCurveIndex(address token) private view returns (uint256) {
        int256 index = -1;
        for (uint256 i = 0; i < curveAssetsLength; i++) {
            address tokenAtIndex = curveSwapper.curvePool().coins(i);
            if (tokenAtIndex == token) {
                index = int256(i);
            }
        }
        require(index > -1, 'asset not found');
        return uint256(index);
    }

    function _curveSwap(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 tokenInAmount,
        uint256 minAmount
    ) private returns (uint256) {
        (, address tokenInAddress, , ) = _yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = _yieldBox.assets(tokenOutId);

        uint256 tokenInCurveIndex = _getCurveIndex(tokenInAddress);
        uint256 tokenOutCurveIndex = _getCurveIndex(tokenOutAddress);

        uint256[] memory indexes = new uint256[](2);
        indexes[0] = tokenInCurveIndex;
        indexes[1] = tokenOutCurveIndex;
        uint256 tokenInShare = _yieldBox.toShare(
            tokenInId,
            tokenInAmount,
            false
        );
        (, uint256 shareOut) = curveSwapper.swap(
            tokenInId,
            tokenOutId,
            indexes,
            tokenInShare,
            minAmount,
            address(this)
        );

        return shareOut;
    }

    function _uniswapSwap(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 tokenInAmount,
        uint256 minAmount
    ) private returns (uint256) {
        (, address tokenInAddress, , ) = _yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = _yieldBox.assets(tokenOutId);
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenInAddress;
        swapPath[1] = tokenOutAddress;
        uint256 tokenInShare = _yieldBox.toShare(
            tokenInId,
            tokenInAmount,
            false
        );
        (uint256 outAmount, ) = univ2Swapper.swap(
            tokenInId,
            tokenOutId,
            minAmount,
            address(_liquidationQueue),
            swapPath,
            tokenInShare
        );

        return outAmount;
    }

    function _curveOutputAmount(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountIn
    ) private view returns (uint256) {
        (, address tokenInAddress, , ) = _yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = _yieldBox.assets(tokenOutId);

        uint256 tokenInCurveIndex = _getCurveIndex(tokenInAddress);
        uint256 tokenOutCurveIndex = _getCurveIndex(tokenOutAddress);
        uint256[] memory indexes = new uint256[](2);
        indexes[0] = tokenInCurveIndex;
        indexes[1] = tokenOutCurveIndex;

        uint256 share = _yieldBox.toShare(tokenInId, amountIn, false);
        return curveSwapper.getOutputAmount(tokenInId, indexes, share);
    }

    function _uniswapOutputAmount(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountIn
    ) private view returns (uint256) {
        (, address tokenInAddress, , ) = _yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = _yieldBox.assets(tokenOutId);
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenInAddress;
        swapPath[1] = tokenOutAddress;
        uint256 tokenInShare = _yieldBox.toShare(tokenInId, amountIn, false);
        return univ2Swapper.getOutputAmount(tokenInId, swapPath, tokenInShare);
    }
}
