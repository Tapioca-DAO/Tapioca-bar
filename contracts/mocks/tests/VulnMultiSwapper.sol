// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../../Penrose.sol';

contract VulnMultiSwapper {
    function counterfeitSwap(
        Penrose penrose,
        uint256 assetId,
        address target
    ) public {
        penrose.yieldBox().withdraw(
            assetId,
            target,
            msg.sender,
            penrose.yieldBox().amountOf(target, assetId),
            0
        );
    }
}
