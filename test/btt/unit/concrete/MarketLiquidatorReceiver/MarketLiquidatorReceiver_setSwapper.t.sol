// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// contracts
import {MarketLiquidatorReceiver} from "contracts/liquidators/MarketLiquidatorReceiver.sol";

import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";

contract MarketLiquidatorReceiver_setSwapper is MarketLiquidatorReceiver_Unit_Shared {
    function test_RevertWhen_TheCallerIsNotTheOwner() external {
        vm.startPrank(userA);
        vm.expectRevert();
        receiver.setSwapper(address(0));
        vm.stopPrank();
    }

    function test_WhenTheCallerIsTheOwner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.expectEmit();
        emit MarketLiquidatorReceiver.SwapperAssigned(address(swapper), rndAddr);
        receiver.setSwapper(rndAddr);

        address assignedSwapper = receiver.swapper();
        assertEq(assignedSwapper, rndAddr);
    }
}
