// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../../bar/BeachBar.sol';

contract VulnMultiSwapper {
    function counterfeitSwap(
        BeachBar beachbar,
        uint256 assetId,
        address target
    ) public {
        beachbar.yieldBox().withdraw(
            assetId,
            target,
            msg.sender,
            beachbar.yieldBox().amountOf(target, assetId),
            0
        );
    }
}
