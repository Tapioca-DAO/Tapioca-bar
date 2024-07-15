// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";

import {Penrose} from "contracts/Penrose.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";


contract Penrose_masterContracts is Markets_Unit_Shared {
    // function registerBigBangMasterContract(address mcAddress, IPenrose.ContractType contractType_) external onlyOwner {
    function test_RevertWhen_RegisterBigBangMasterContractIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        vm.stopPrank();
    }

    function test_RevertWhen_RegisterBigBangMasterContractIsCalledFromOwnerForAlreadyRegistered() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        vm.expectRevert();
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
    }

    function test_WhenRegisterBigBangMasterContractIsCalledFromOwnerForNewContract() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectEmit();
        emit Penrose.RegisterBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        penrose.registerBigBangMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        assertTrue(penrose.isBigBangMasterContractRegistered(rndAddr));
    }

    function test_RevertWhen_RegisterSingularityMasterContractIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        vm.stopPrank();
    }

    function test_RevertWhen_RegisterSingularityMasterContractIsCalledFromOwnerForAlreadyRegistered() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        vm.expectRevert();
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
    }

    function test_WhenRegisterSingularityMasterContractIsCalledFromOwnerForNewContract() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectEmit();
        emit Penrose.RegisterSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        assertTrue(penrose.isSingularityMasterContractRegistered(rndAddr));
    }
}
