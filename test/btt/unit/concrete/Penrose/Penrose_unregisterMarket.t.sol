// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";

import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract Penrose_unregisterContract is BigBang_Unit_Shared {
    function test_RevertWhen_UnregisterContractIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.registerBigBang(rndAddr, "0x", false);
        vm.stopPrank();
    }

    function test_WhenUnregisterContractIsCalledFromOwnerForType1() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);

        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(
            BigBangInitData(
                address(penrose),
                address(mainToken), //asset
                mainTokenId,
                ITapiocaOracle(address(rndAddr)),
                ILeverageExecutor(address(rndAddr)),
                0,
                0,
                0
            )
        );
        address _contract =
            penrose.registerBigBang(rndAddr, abi.encode(initModulesData, initDebtData, initMemoryData), true);
        assertTrue(penrose.isMarketRegistered(_contract));

        penrose.unregisterContract(_contract, 1);
        assertFalse(penrose.isMarketRegistered(_contract));
    }

    function test_WhenUnregisterContractIsCalledFromOwnerForType2() external {
        address rndAddr = makeAddr("rndAddress");

        penrose.addOriginsMarket(rndAddr);
        assertTrue(penrose.isOriginRegistered(rndAddr));
        assertEq(penrose.allOriginsMarkets(0), rndAddr);
        penrose.unregisterContract(rndAddr, 2);
        assertFalse(penrose.isOriginRegistered(rndAddr));
    }
}
