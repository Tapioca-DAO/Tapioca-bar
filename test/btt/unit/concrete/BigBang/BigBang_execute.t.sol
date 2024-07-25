// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_execute is BigBang_Unit_Shared {
    function test_WhenExecuteIsCalledForRegisteredModule() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.addCollateral(address(this), address(bb), false, 1 ether, 0);

        vm.expectRevert("Market: cannot execute on itself");
        bb.execute(modules, calls, true);
    }
}
