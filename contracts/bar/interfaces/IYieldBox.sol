// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../enums/YieldBoxTokenType.sol';
import './IStrategy.sol';

interface IYieldBox {
    function wrappedNative() external view returns (address wrappedNative);

    function assets(uint256 assetId)
        external
        view
        returns (
            TokenType tokenType,
            address contractAddress,
            IStrategy strategy,
            uint256 tokenId
        );

    function nativeTokens(uint256 assetId)
        external
        view
        returns (
            string memory name,
            string memory symbol,
            uint8 decimals
        );

    function owner(uint256 assetId) external view returns (address owner);

    function totalSupply(uint256 assetId)
        external
        view
        returns (uint256 totalSupply);
}
