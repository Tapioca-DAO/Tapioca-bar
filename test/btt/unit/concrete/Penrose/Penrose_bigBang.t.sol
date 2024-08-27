// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";
import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";

contract Penrose_bigBang is BigBang_Unit_Shared {
    function test_RevertWhen_RegisterBigBangIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.registerBigBang(rndAddr, "0x", false);
        vm.stopPrank();
    }

    function test_RevertWhen_RegisterBigBangIsCalledFromOwnerForNon_registeredMasterContract() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectRevert();
        penrose.registerBigBang(rndAddr, "0x", false);
    }

    function test_RevertWhen_RegisterBigBangIsCalledFromOwnerForAddress0() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        vm.expectRevert();
        penrose.registerBigBang(address(0), "0x", false);
    }

    function test_WhenRegisterBigBangIsCalledFromOwnerForNewContract() external {
        assertTrue(penrose.isMarketRegistered(address(mainBB)));
        assertTrue(penrose.isMarketRegistered(address(secondaryBB)));
    }

    function test_RevertWhen_AddBigBangIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.addBigBang(rndAddr, rndAddr);
        vm.stopPrank();
    }

    function test_RevertWhen_AddBigBangIsCalledFromOwnerForNon_registeredMasterContract() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectRevert();
        penrose.addBigBang(rndAddr, rndAddr);
    }

    function test_RevertWhen_AddBigBangIsCalledFromOwnerForAlreadyRegisteredContract() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        penrose.addBigBang(rndAddr, rndAddr);
        vm.expectRevert();
        penrose.addBigBang(rndAddr, rndAddr);
    }

    function test_WhenAddBigBangIsCalledFromOwnerForNewContract() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        penrose.addBigBang(rndAddr, rndAddr);
        assertTrue(penrose.isMarketRegistered(rndAddr));
    }
}
