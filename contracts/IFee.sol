// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import './IPenrose.sol';
import './swappers/IMultiSwapper.sol';

interface IFee {
    function depositFeesToYieldBox(IMultiSwapper, IPenrose.SwapData calldata)
        external;
}
