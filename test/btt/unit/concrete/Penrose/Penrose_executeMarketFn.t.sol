// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";

contract Penrose_executeMarketFn is Markets_Unit_Shared {
    function test_RevertWhen_ExecuteMarketFnIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = rndAddr;
        data[0] = "0x";

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.executeMarketFn(mc, data, true);
        vm.stopPrank();
    }

    function test_WhenExecuteMarketFnIsCalledFromOwner() external {
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

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = _contract;
        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, rndAddr);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);
    }
}
