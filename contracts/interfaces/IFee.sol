// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "./IPenrose.sol";
import "../swappers/ISwapper.sol";

interface IFee {
    function depositFeesToYieldBox(
        ISwapper,
        IPenrose.SwapData calldata
    ) external;
}
