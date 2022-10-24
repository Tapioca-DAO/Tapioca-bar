// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

import '../../IBeachBar.sol';
import '../ILiquidationQueue.sol';
import '../../swappers/IMultiSwapper.sol';
import '../../mixologist/interfaces/IMixologist.sol';
import '../../../yieldbox/contracts/interfaces/IYieldBox.sol';

/// @notice Swaps USD0 to WETH UniswapV2
/// @dev Performs 1 swap operation:
///     - USD0 to Weth through UniV2
contract UniUsdoToWethBidder is BoringOwnable {
    // ************ //
    // *** DATA *** //
    // ************ //

    // --- Public ---
    /// @notice UniswapV2 swapper
    IMultiSwapper public univ2Swapper;

    // --- Private ---
    uint256 wethId;

    // --- Events ---
    event UniV2SwapperUpdated(address indexed _old, address indexed _new);

    constructor(IMultiSwapper uniV2Swapper_, uint256 _wethAssetId) {
        univ2Swapper = uniV2Swapper_;
        wethId = _wethAssetId;
    }

    // ************ //
    // *** METHODS *** //
    // ************ //
    // --- View methods ---
    /// @notice returns the unique name
    function name() external pure returns (string memory) {
        return 'USD0 -> WETH (Uniswap V2)';
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
            tokenInId == IBeachBar(mixologist.beachBar()).usdoAssetId(),
            'token not valid'
        );
        IYieldBox yieldBox = IYieldBox(mixologist.yieldBox());

        uint256 shareOut = yieldBox.toShare(wethId, amountOut, false);

        (, address tokenInAddress, , ) = yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = yieldBox.assets(wethId);

        address[] memory path = new address[](2);
        path[0] = tokenInAddress;
        path[1] = tokenOutAddress;

        return univ2Swapper.getInputAmount(wethId, path, shareOut);
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
        require(tokenInId == usdoAssetId, 'token not valid');

        return
            _uniswapOutputAmount(
                IYieldBox(mixologist.yieldBox()),
                usdoAssetId,
                wethId,
                amountIn
            );
    }

    // --- Write methods ---
    /// @notice swaps stable to collateral
    /// @param tokenInId Token in asset Id
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
        require(tokenInId == usdoAssetId, 'token not valid');
        require(msg.sender == address(liquidationQueue), 'only LQ');

        uint256 assetMin = 0;
        if (data.length > 0) {
            //should always be sent
            assetMin = abi.decode(data, (uint256));
        }

        yieldBox.transfer(
            address(this),
            address(univ2Swapper),
            tokenInId,
            yieldBox.toShare(tokenInId, amountIn, false)
        );

        return
            _uniswapSwap(
                yieldBox,
                usdoAssetId,
                wethId,
                amountIn,
                assetMin,
                address(liquidationQueue)
            );
    }

    // --- Owner methods ---
    /// @notice sets the UniV2 swapper
    /// @dev used for WETH to USDC swap
    /// @param _swapper The UniV2 pool swapper address
    function setUniswapSwapper(IMultiSwapper _swapper) external onlyOwner {
        emit UniV2SwapperUpdated(address(univ2Swapper), address(_swapper));
        univ2Swapper = _swapper;
    }

    // --- Private methods ---
    function _uniswapSwap(
        IYieldBox yieldBox,
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 tokenInAmount,
        uint256 minAmount,
        address to
    ) private returns (uint256) {
        (, address tokenInAddress, , ) = yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = yieldBox.assets(tokenOutId);
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenInAddress;
        swapPath[1] = tokenOutAddress;
        uint256 tokenInShare = yieldBox.toShare(
            tokenInId,
            tokenInAmount,
            false
        );
        (uint256 outAmount, ) = univ2Swapper.swap(
            tokenInId,
            tokenOutId,
            minAmount,
            to,
            swapPath,
            tokenInShare
        );

        return outAmount;
    }

    function _uniswapOutputAmount(
        IYieldBox yieldBox,
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountIn
    ) private view returns (uint256) {
        (, address tokenInAddress, , ) = yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = yieldBox.assets(tokenOutId);
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenInAddress;
        swapPath[1] = tokenOutAddress;
        uint256 tokenInShare = yieldBox.toShare(tokenInId, amountIn, false);
        return univ2Swapper.getOutputAmount(tokenInId, swapPath, tokenInShare);
    }
}
