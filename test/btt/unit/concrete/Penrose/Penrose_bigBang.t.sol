// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";


contract Penrose_bigBang is Markets_Unit_Shared {
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
