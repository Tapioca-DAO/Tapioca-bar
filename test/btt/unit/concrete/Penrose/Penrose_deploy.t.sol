// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";

contract Penrose_deploy is Markets_Unit_Shared {
    function test_RevertWhen_DeployIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.deploy(rndAddr, "0x", false);

        vm.expectRevert();
        penrose.deploy(rndAddr, "0x", true);
        vm.stopPrank();
    }

    function test_RevertWhen_DeployIsCalledFromOwnerWithNoMasterContract() external {
        vm.expectRevert();
        penrose.deploy(address(0), "0x", false);

        vm.expectRevert();
        penrose.deploy(address(0), "0x", true);
    }

    function test_WhenDeployIsCalledFromOwnerWithMasterContractForCreate() external {
        address rndAddr = makeAddr("rndAddress");

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
        address cloneAddress = penrose.deploy(rndAddr, abi.encode(initModulesData, initDebtData, initMemoryData), false);
        assertEq(penrose.masterContractOf(cloneAddress), rndAddr);
        assertEq(penrose.clonesOf(rndAddr, 0), cloneAddress);
    }

    function test_WhenDeployIsCalledFromOwnerWithMasterContractForCreate2() external {
        address rndAddr = makeAddr("rndAddress");

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
        address cloneAddress = penrose.deploy(rndAddr, abi.encode(initModulesData, initDebtData, initMemoryData), true);
        assertEq(penrose.masterContractOf(cloneAddress), rndAddr);
        assertEq(penrose.clonesOf(rndAddr, 0), cloneAddress);
    }
}
