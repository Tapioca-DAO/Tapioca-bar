// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// contracts
import {SGlpMarketLiquidatorReceiver} from "contracts/liquidators/sGlpMarketLiquidatorReceiver.sol";

import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";

contract sGlpMarketLiquidatorReceiver_setAllowedParticipant is MarketLiquidatorReceiver_Unit_Shared {
    function test_RevertWhen_TheCallerIsNotTheOwner() external {
        vm.startPrank(userA);
        vm.expectRevert();
        sGlpReceiver.setAllowedParticipant(address(0), true);
        vm.stopPrank();
    }

    function test_WhenTheCallerIsTheOwner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.expectEmit();
        emit SGlpMarketLiquidatorReceiver.AllowedParticipantAssigned(rndAddr, true);
        sGlpReceiver.setAllowedParticipant(rndAddr, true);

        bool isWhitelisted = sGlpReceiver.allowedParticipants(rndAddr);
        assertTrue(isWhitelisted);
    }
}
