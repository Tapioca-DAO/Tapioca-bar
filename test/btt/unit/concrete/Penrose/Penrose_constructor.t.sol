// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract Penrose_constructor is BigBang_Unit_Shared {
    function test_WhenPenroseIsCreated() external {
        // it should have all initial state variables set
        assertEq(address(penrose.yieldBox()), address(yieldBox));
        assertEq(address(penrose.cluster()), address(cluster));
        assertEq(address(penrose.tapToken()), address(tapToken));
        assertEq(address(penrose.mainToken()), address(mainToken));
        assertEq(penrose.tapAssetId(), tapTokenId);
        assertEq(penrose.mainAssetId(), mainTokenId);
        assertEq(penrose.bigBangEthDebtRate(), 5e17);
        assertEq(penrose.owner(), address(this));
    }
}
