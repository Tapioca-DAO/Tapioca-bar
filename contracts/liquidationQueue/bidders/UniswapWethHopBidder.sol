// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

import '../../mixologist/Mixologist.sol';
import '../../swappers/MultiSwapper.sol';

import './IStableBidder.sol';

/// @notice Swaps Stable to tAsset through UniswapV2
/// @dev Performs 2 swap operations:
///     - Stable to WETH through UniV2
///     - WETH to tAsset through UniV2
contract UniswapWethHopBidder is IStableBidder, BoringOwnable {
    // ************ //
    // *** DATA *** //
    // ************ //

    // --- Public ---
    /// @notice UniswapV2 swapper
    MultiSwapper public univ2Swapper;

    // --- Private ---
    Mixologist _mixologist;
    YieldBox _yieldBox;
    ILiquidationQueue _liquidationQueue;
    uint256 wethAssetId;
    uint256 tAssetId;

    // --- Events ---
    event UniV2SwapperUpdated(address indexed _old, address indexed _new);

    constructor(
        MultiSwapper uniV2Swapper_,
        Mixologist mixologist_,
        uint256 wethAssetId_
    ) {
        univ2Swapper = uniV2Swapper_;

        _mixologist = mixologist_;
        _yieldBox = mixologist_.yieldBox();
        _liquidationQueue = mixologist_.liquidationQueue();

        wethAssetId = wethAssetId_;
        tAssetId = mixologist_.collateralId();
    }

    // ************ //
    // *** METHODS *** //
    // ************ //
    // --- View methods ---
    /// @notice returns the unique name
    function name() external pure returns (string memory) {
        return 'stable -> WETH (Uniswap V2) / WETH -> tAsset (Uniswap V2)';
    }

    /// @notice returns the swapper address who performs the first swap
    /// @dev used for sending funds to it
    function firstStepSwapper() external view returns (address) {
        return address(univ2Swapper);
    }

    /// @notice returns the amount of collateral
    /// @param amountIn Stablecoin amount
    function getOutputAmount(
        uint256 stableAssetId,
        uint256 amountIn,
        bytes calldata
    ) external view returns (uint256) {
        //Stable->WETH
        uint256 wethAmount = _outputAmount(
            stableAssetId,
            wethAssetId,
            amountIn
        );

        //WETH->tAsset
        return _outputAmount(wethAssetId, tAssetId, wethAmount);
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

        uint256 _wethMin = 0;
        uint256 _tAssetMin = 0;
        if (data.length > 0) {
            //should always be sent
            (_wethMin, _tAssetMin) = abi.decode(data, (uint256, uint256));
        }

        uint256 stableShare = _yieldBox.toShare(stableAssetId, amountIn, false);
        _yieldBox.transfer(
            address(_liquidationQueue),
            address(univ2Swapper),
            stableAssetId,
            stableShare
        ); //TODO: check if we want to do it directly without the yieldbox deposit

        //Stable -> WETH;
        uint256 wethAmount = _swap(
            stableAssetId,
            wethAssetId,
            stableShare,
            _wethMin
        );

        //WETH->tAsset
        uint256 wethShare = _yieldBox.toShare(wethAssetId, wethAmount, false);
        uint256 liquidatedAmount = _swap(
            wethAssetId,
            tAssetId,
            wethShare,
            _tAssetMin
        );

        return liquidatedAmount;
    }

    // --- Owner methods ---

    /// @notice sets the UniV2 swapper
    /// @dev used for WETH to USDC swap
    /// @param _swapper The UniV2 pool swapper address
    function setUniswapSwapper(MultiSwapper _swapper) external onlyOwner {
        emit UniV2SwapperUpdated(address(univ2Swapper), address(_swapper));
        univ2Swapper = _swapper;
    }

    // --- Private methods ---
    function _swap(
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 tokenInShare,
        uint256 minAmount
    ) private returns (uint256) {
        (, address tokenInAddress, , ) = _yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = _yieldBox.assets(tokenOutId);
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenInAddress;
        swapPath[1] = tokenOutAddress;
        (uint256 outAmount, ) = univ2Swapper.swap(
            tokenInId,
            tokenOutId,
            minAmount,
            address(univ2Swapper),
            swapPath,
            tokenInShare
        );
        return outAmount;
    }

    function _outputAmount(
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
