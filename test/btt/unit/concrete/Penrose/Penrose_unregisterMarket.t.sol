// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";

contract Penrose_unregisterContract is Markets_Unit_Shared {
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
            TestBigBangData(
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
        address _contract = penrose.registerBigBang(rndAddr, abi.encode(initModulesData, initDebtData, initMemoryData), true);
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
