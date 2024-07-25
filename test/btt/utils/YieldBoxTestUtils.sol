// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";

contract YieldBoxTestUtils {
    function createEmptyStrategy(address yb, address asset) public returns (ERC20WithoutStrategy) {
        return new ERC20WithoutStrategy(IYieldBox(yb), IERC20(asset));
    }
}
