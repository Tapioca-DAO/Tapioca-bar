// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '../../swappers/MultiSwapper.sol';

interface IMixologistLiquidation {
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        MultiSwapper swapper,
        bytes calldata collateralToAssetSwapData,
        bytes calldata usdoToBorrowedSwapData
    ) external;
}
