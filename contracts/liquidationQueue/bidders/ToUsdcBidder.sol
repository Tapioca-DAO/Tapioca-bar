// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

import '../../mixologist/Mixologist.sol';
import '../../swappers/MultiSwapper.sol';

import './IUsdoBidder.sol';

/// @notice Swaps USD0 to USDC
/// @dev Performs 2 swap operations:
///     - USD0 to WETH through Curve
///     - WETH to USDC through Uniswap
contract ToUsdcBidder is IUsdoBidder, BoringOwnable {
    /// @notice returns the mixologist address
    Mixologist public mixologist;

    /// @notice UniswapV2 swapper
    MultiSwapper public univ2Swapper;
    /// @notice Curve pool swapper
    MultiSwapper public curveSwapper;

    constructor(
        MultiSwapper uniV2Swapper_,
        MultiSwapper curveSwapper_,
        Mixologist mixologist_
    ) {
        univ2Swapper = uniV2Swapper_;
        curveSwapper = curveSwapper_;
        mixologist = mixologist_;
    }

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
        uint256 usdoAssetId = mixologist.beachBar().usdoAssetId();
        uint256 collateralAssetId = mixologist.collateralId();

        (, address usdoAddress, , ) = mixologist.yieldBox().assets(usdoAssetId);
        (, address collateralAddress, , ) = mixologist.yieldBox().assets(
            collateralAssetId
        );

        address[] memory uniV2SwapPath = new address[](2);
        uniV2SwapPath[0] = usdoAddress;
        uniV2SwapPath[1] = collateralAddress;

        return
            univ2Swapper.getOutputAmount(usdoAssetId, uniV2SwapPath, amountIn);
    }

    /// @notice swap USD0 to collateral
    /// @param bidder the sender to swap it from
    /// @param usdoAmount USD0 amount
    /// @param data extra data used for the swap operation
    function swap(
        address bidder,
        uint256 usdoAmount,
        bytes calldata data
    ) external returns (uint256) {
        require(
            msg.sender == address(mixologist.liquidationQueue()),
            'only LQ'
        );

        uint256 usdoAssetId = mixologist.beachBar().usdoAssetId();
        uint256 collateralAssetId = mixologist.collateralId();

        YieldBox _yieldBox = mixologist.yieldBox();

        //TODO: check if we want to do it directly without the yieldbox deposit
        uint256 usdoShare = _yieldBox.toShare(usdoAssetId, usdoAmount, false);
        _yieldBox.transfer(
            bidder,
            address(univ2Swapper),
            usdoAssetId,
            usdoShare
        );

        uint256 liquidatedMinAmount = abi.decode(data, (uint256));

        (, address usdoAddress, , ) = _yieldBox.assets(usdoAssetId);
        (, address collateralAddress, , ) = _yieldBox.assets(collateralAssetId);

        address[] memory uniV2SwapPath = new address[](2);
        uniV2SwapPath[0] = usdoAddress;
        uniV2SwapPath[1] = collateralAddress;

        //SWAP
        (uint256 liquidatedAssetAmount, ) = univ2Swapper.swap(
            usdoAssetId,
            collateralAssetId,
            liquidatedMinAmount,
            address(mixologist.liquidationQueue()),
            uniV2SwapPath,
            usdoShare
        );

        return liquidatedAssetAmount;
    }
}
