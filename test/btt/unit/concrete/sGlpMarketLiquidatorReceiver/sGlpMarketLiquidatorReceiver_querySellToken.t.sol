// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// contracts
import {SGlpMarketLiquidatorReceiver} from "contracts/liquidators/sGlpMarketLiquidatorReceiver.sol";

import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";

contract sGlpMarketLiquidatorReceiver_querySellToken is MarketLiquidatorReceiver_Unit_Shared {
    address public constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    function test_WhenQuerySellTokenIsCalled() external {
        address queryToken = sGlpReceiver.querySellToken(address(0));
        assertEq(queryToken, USDC);
    }

    function test_WhenSGlpMarketLiquidatorReceiverWasCreated() external {
        assertEq(sGlpReceiver.weth(), address(weth));
        assertEq(address(sGlpReceiver.cluster()), address(cluster));
        assertEq(sGlpReceiver.swapper(), address(swapper));
        assertEq(sGlpReceiver.owner(), address(this));
    }
}
