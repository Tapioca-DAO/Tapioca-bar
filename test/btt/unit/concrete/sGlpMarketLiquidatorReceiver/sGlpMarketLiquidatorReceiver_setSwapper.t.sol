// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// contracts
import {SGlpMarketLiquidatorReceiver} from "contracts/liquidators/sGlpMarketLiquidatorReceiver.sol";

import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";

contract sGlpMarketLiquidatorReceiver_setSwapper is MarketLiquidatorReceiver_Unit_Shared {
    function test_RevertWhen_TheCallerIsNotTheOwner() external {
        vm.startPrank(userA);
        vm.expectRevert();
        sGlpReceiver.setSwapper(address(0));
        vm.stopPrank();
    }

    function test_WhenTheCallerIsTheOwner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.expectEmit();
        emit SGlpMarketLiquidatorReceiver.SwapperAssigned(address(swapper), rndAddr);
        sGlpReceiver.setSwapper(rndAddr);

        address assignedSwapper = sGlpReceiver.swapper();
        assertEq(assignedSwapper, rndAddr);
    }
}
