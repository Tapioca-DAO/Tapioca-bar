// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import './usd0/IUSD0.sol';
import './swappers/IMultiSwapper.sol';

interface IBeachBar {
    struct SwapData {
        uint256 minAssetAmount;
    }

    function swappers(IMultiSwapper swapper) external view returns (bool);

    function yieldBox() external view returns (address payable);

    function tapToken() external view returns (address);

    function tapAssetId() external view returns (uint256);

    function usdoToken() external view returns (address);

    function usdoAssetId() external view returns (uint256);

    function feeTo() external view returns (address);

    function feeVeTap() external view returns (address);
}
