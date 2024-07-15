// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";

contract Penrose_executeTarget is Markets_Unit_Shared {
    function test_RevertWhen_ExecuteTargetIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.executeTargetFn(rndAddr, "0x");
        vm.stopPrank();
    }

    function test_RevertWhen_ExecuteTargetIsCalledFromOwnerWithNoWhilistedTarget() external {
        address rndAddr = makeAddr("rndAddress");

        vm.expectRevert();
        penrose.executeTargetFn(rndAddr, "0x");
    }

    function test_WhenExecuteTargetIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");
        cluster.updateContract(0, rndAddr, true);
        penrose.executeTargetFn(rndAddr, "0x");
    }
}
