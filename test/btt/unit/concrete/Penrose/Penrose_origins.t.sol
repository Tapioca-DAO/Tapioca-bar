// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";
contract Penrose_origins is Markets_Unit_Shared {
    function test_RevertWhen_AddOriginsMarketIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.addOriginsMarket(rndAddr);
        vm.stopPrank(); 
    }

    function test_RevertWhen_AddOriginsMarketIsCalledFromOwnerForAlreadyRegisteredContract() external {
        address rndAddr = makeAddr("rndAddress");

        penrose.addOriginsMarket(rndAddr);
        assertTrue(penrose.isOriginRegistered(rndAddr));
        vm.expectRevert();
        penrose.addOriginsMarket(rndAddr);
    }

    function test_WhenAddOriginsMarketIsCalledFromOwnerForNewContract() external {
        address rndAddr = makeAddr("rndAddress");

        penrose.addOriginsMarket(rndAddr);
        assertTrue(penrose.isOriginRegistered(rndAddr));
        assertEq(penrose.allOriginsMarkets(0), rndAddr);
    }
}
