// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// mocks
import {OracleMock_test} from "../../../mocks/OracleMock_test.sol";

import {IBigBangDebtRateHelper} from "tapioca-periph/interfaces/bar/IBigBangDebtRateHelper.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";

// dependencies
import {BBDebtRateHelper} from "contracts/markets/bigBang/BBDebtRateHelper.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_viewMethods is BigBang_Unit_Shared {
    function test_RevertWhen_ComputeVariableOpeningFeeIsCalledAndAssetOracleIsNotSet() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        vm.expectRevert();
        bb.computeVariableOpeningFee(1 ether);
    }

    function test_WhenComputeVariableOpeningFeeIsCalled() external {
        OracleMock_test assetOracle = new OracleMock_test("A", "A", 0.5 ether);
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.setAssetOracle.selector, address(assetOracle), "0x");
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        uint256 openingFee = bb.computeVariableOpeningFee(1 ether);
        assertGt(openingFee, 0);
    }

    function test_WhenGetDebtRateIsCalled() external {
        BBDebtRateHelper rateHelper = new BBDebtRateHelper();
        penrose.setBigBangEthMarketDebtRate(0.5 ether);
        assertEq(penrose.bigBangEthDebtRate(), 0.5 ether);

        // main market
        uint256 val = rateHelper.getDebtRate(
            IBigBangDebtRateHelper.DebtRateCall({
                isMainMarket: true,
                penrose: IPenrose(address(penrose)),
                elastic: 1 ether,
                debtRateAgainstEthMarket: 0,
                maxDebtRate: 0.05 ether,
                minDebtRate: 0.005 ether
            })
        );
        assertGt(val, 0);

        // non-main market; elastic 0
        val = rateHelper.getDebtRate(
            IBigBangDebtRateHelper.DebtRateCall({
                isMainMarket: false,
                penrose: IPenrose(address(penrose)),
                elastic: 0,
                debtRateAgainstEthMarket: 0.2 ether,
                maxDebtRate: 0,
                minDebtRate: 0.005 ether
            })
        );
        assertEq(val, 0.005 ether);

        // non-main market; elastic > 0
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        penrose.setBigBangEthMarket(address(bb));
        assertEq(address(penrose.bigBangEthMarket()), address(bb));

        rateHelper.getDebtRate(
            IBigBangDebtRateHelper.DebtRateCall({
                isMainMarket: false,
                penrose: IPenrose(address(penrose)),
                elastic: 1 ether,
                debtRateAgainstEthMarket: 0.2 ether,
                maxDebtRate: 0.05 ether,
                minDebtRate: 0.005 ether
            })
        );
        assertGt(val, 0);
    }

    function test_RevertWhen_ComputeVariableOpeningFeeAndOracleIsNotWorking() external {
        OracleMock_test assetOracle = new OracleMock_test("A", "A", 0.5 ether);
        assetOracle.setSuccess(false);
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.setAssetOracle.selector, address(assetOracle), "0x");
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        vm.expectRevert();
        bb.computeVariableOpeningFee(1 ether);
    }
}
