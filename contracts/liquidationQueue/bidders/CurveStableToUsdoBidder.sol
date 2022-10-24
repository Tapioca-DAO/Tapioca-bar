// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

import '../../IBeachBar.sol';
import '../ILiquidationQueue.sol';
import '../../libraries/ICurvePool.sol';
import '../../swappers/ICurveSwapper.sol';
import '../../mixologist/interfaces/IMixologist.sol';
import '../../../yieldbox/contracts/interfaces/IYieldBox.sol';

/// @notice Swaps Stable to USD0 through Curve
/// @dev Performs a swap operation between stable and USD0 through 3CRV+USD0 pool
contract CurveStableToUsdoBidder is BoringOwnable {
    // ************ //
    // *** DATA *** //
    // ************ //

    // --- Public ---
    /// @notice 3Crv+USD0 swapper
    ICurveSwapper public curveSwapper;

    // --- Private ---
    uint256 curveAssetsLength;

    // --- Events ---
    event CurveSwapperUpdated(address indexed _old, address indexed _new);

    constructor(ICurveSwapper curveSwapper_, uint256 curvePoolAssetCount_) {
        curveSwapper = curveSwapper_;
        curveAssetsLength = curvePoolAssetCount_;
    }

    // ************ //
    // *** METHODS *** //
    // ************ //
    // --- View methods ---
    /// @notice returns the unique name
    function name() external pure returns (string memory) {
        return 'stable -> USD0 (3Crv+USD0)';
    }

    /// @notice returns the amount of collateral
    /// @param amountIn Stablecoin amount
    function getOutputAmount(
        IMixologist mixologist,
        uint256 tokenInId,
        uint256 amountIn,
        bytes calldata
    ) external view returns (uint256) {
        require(
            IBeachBar(mixologist.beachBar()).usdoToken() != address(0),
            'USD0 not set'
        );

        uint256 usdoAssetId = IBeachBar(mixologist.beachBar()).usdoAssetId();
        if (tokenInId == usdoAssetId) {
            return amountIn;
        }

        return
            _getOutput(
                IYieldBox(mixologist.yieldBox()),
                tokenInId,
                usdoAssetId,
                amountIn
            );
    }

    /// @notice returns token tokenIn amount based on tokenOut amount
    /// @param tokenInId Token in asset id
    /// @param amountOut Token out amount
    function getInputAmount(
        IMixologist mixologist,
        uint256 tokenInId,
        uint256 amountOut,
        bytes calldata
    ) external view returns (uint256) {
        require(
            IBeachBar(mixologist.beachBar()).usdoToken() != address(0),
            'USD0 not set'
        );

        uint256 usdoAssetId = IBeachBar(mixologist.beachBar()).usdoAssetId();
        if (tokenInId == usdoAssetId) {
            return amountOut;
        }

        return
            _getOutput(
                IYieldBox(mixologist.yieldBox()),
                usdoAssetId,
                tokenInId,
                amountOut
            );
    }

    // --- Write methods ---
    /// @notice swaps stable to collateral
    /// @param tokenInId Stablecoin asset id
    /// @param amountIn Stablecoin amount
    /// @param data extra data used for the swap operation
    function swap(
        IMixologist mixologist,
        uint256 tokenInId,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256) {
        require(
            IBeachBar(mixologist.beachBar()).usdoToken() != address(0),
            'USD0 not set'
        );
        IYieldBox yieldBox = IYieldBox(mixologist.yieldBox());
        ILiquidationQueue liquidationQueue = ILiquidationQueue(
            mixologist.liquidationQueue()
        );

        uint256 usdoAssetId = IBeachBar(mixologist.beachBar()).usdoAssetId();
        require(msg.sender == address(liquidationQueue), 'only LQ');
        if (tokenInId == usdoAssetId) {
            yieldBox.transfer(
                address(this),
                address(liquidationQueue),
                tokenInId,
                yieldBox.toShare(tokenInId, amountIn, false)
            );
            return amountIn;
        }

        uint256 _usdoMin = 0;
        if (data.length > 0) {
            //should always be sent
            _usdoMin = abi.decode(data, (uint256));
        }
        yieldBox.transfer(
            address(this),
            address(curveSwapper),
            tokenInId,
            yieldBox.toShare(tokenInId, amountIn, false)
        );
        return
            _swap(
                yieldBox,
                tokenInId,
                usdoAssetId,
                amountIn,
                _usdoMin,
                address(liquidationQueue)
            );
    }

    // --- Owner methods ---
    /// @notice sets the Curve swapper
    /// @dev used for USD0 to WETH swap
    /// @param _swapper The curve pool swapper address
    function setCurveSwapper(ICurveSwapper _swapper) external onlyOwner {
        emit CurveSwapperUpdated(address(curveSwapper), address(_swapper));
        curveSwapper = _swapper;
    }

    // --- Private methods ---
    function _getCurveIndex(address token) private view returns (uint256) {
        int256 index = -1;
        for (uint256 i = 0; i < curveAssetsLength; i++) {
            address tokenAtIndex = ICurvePool(curveSwapper.curvePool()).coins(
                i
            );
            if (tokenAtIndex == token) {
                index = int256(i);
            }
        }
        require(index > -1, 'asset not found');
        return uint256(index);
    }

    function _getOutput(
        IYieldBox yieldBox,
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountIn
    ) private view returns (uint256) {
        (, address tokenInAddress, , ) = yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = yieldBox.assets(tokenOutId);

        uint256 tokenInCurveIndex = _getCurveIndex(tokenInAddress);
        uint256 tokenOutCurveIndex = _getCurveIndex(tokenOutAddress);
        uint256[] memory indexes = new uint256[](2);
        indexes[0] = tokenInCurveIndex;
        indexes[1] = tokenOutCurveIndex;

        uint256 share = yieldBox.toShare(tokenInId, amountIn, false);
        return curveSwapper.getOutputAmount(tokenInId, indexes, share);
    }

    function _swap(
        IYieldBox yieldBox,
        uint256 stableAssetId,
        uint256 usdoAssetId,
        uint256 amountIn,
        uint256 minAmount,
        address to
    ) private returns (uint256) {
        (, address tokenInAddress, , ) = yieldBox.assets(stableAssetId);
        (, address tokenOutAddress, , ) = yieldBox.assets(usdoAssetId);

        uint256 tokenInCurveIndex = _getCurveIndex(tokenInAddress);
        uint256 tokenOutCurveIndex = _getCurveIndex(tokenOutAddress);

        uint256[] memory indexes = new uint256[](2);
        indexes[0] = tokenInCurveIndex;
        indexes[1] = tokenOutCurveIndex;
        uint256 tokenInShare = yieldBox.toShare(stableAssetId, amountIn, false);

        (uint256 amountOut, ) = curveSwapper.swap(
            stableAssetId,
            usdoAssetId,
            indexes,
            tokenInShare,
            minAmount,
            to
        );

        return amountOut;
    }
}
