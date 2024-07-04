// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// contracts
import {MarketLiquidatorReceiver} from "contracts/liquidators/MarketLiquidatorReceiver.sol";

import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";

contract MarketLiquidatorReceiver_setAllowedParticipant is MarketLiquidatorReceiver_Unit_Shared {
    function test_RevertWhen_TheCallerIsNotTheOwner() external {
        vm.startPrank(userA);
        vm.expectRevert();
        receiver.setAllowedParticipant(address(0), true);
        vm.stopPrank();
    }

    function test_WhenTheCallerIsTheOwner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.expectEmit();
        emit MarketLiquidatorReceiver.AllowedParticipantAssigned(rndAddr, true);
        receiver.setAllowedParticipant(rndAddr, true);

        bool isWhitelisted = receiver.allowedParticipants(rndAddr);
        assertTrue(isWhitelisted);
    }
}
