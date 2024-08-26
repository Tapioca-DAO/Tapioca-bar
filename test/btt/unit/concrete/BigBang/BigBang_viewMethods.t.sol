// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {BBDebtRateHelper} from "contracts/markets/bigBang/BBDebtRateHelper.sol";
import {BBCommon} from "contracts/markets/bigBang/BBCommon.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";


import {IBigBangDebtRateHelper} from "tap-utils/interfaces/bar/IBigBangDebtRateHelper.sol";
import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";
import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_viewMethods is BigBang_Unit_Shared {
    function test_RevertWhen_ComputeVariableOpeningFeeIsCalledAndAssetOracleIsNotSet() external {
        BigBang _mc = new BigBang();
        penrose.registerBigBangMasterContract(address(_mc), IPenrose.ContractType.lowRisk);

        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(
            BigBangInitData(
                address(penrose),
                address(mainToken), //collateral
                mainTokenId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(address(leverageExecutor)),
                BB_DEBT_RATE_AGAINST_MAIN_MARKET,
                BB_MIN_DEBT_RATE,
                BB_MAX_DEBT_RATE
            )
        );
        address _contract =
            penrose.registerBigBang(address(_mc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        //        │   │   ├─ [0] 0x0000000000000000000000000000000000000000::peek(0x) [staticcall]
        // │   │   │   └─ ← [Stop]
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        BigBang(payable(_contract)).computeVariableOpeningFee(SMALL_AMOUNT);
    }

    function test_WhenComputeVariableOpeningFeeIsCalled() 
        external 
        whenOracleRateIsEth
    {
        // **** Main BB market ****
        uint256 minMintFeeStart = mainBB.minMintFeeStart();
        uint256 maxMintFeeStart = mainBB.maxMintFeeStart();
        uint256 minMintFee = mainBB.minMintFee();
        uint256 maxMintFee = mainBB.maxMintFee();

        assetOracle.set(minMintFeeStart + 1); // greater than `minMintFeeStart`
        uint256 openingFee = mainBB.computeVariableOpeningFee(SMALL_AMOUNT);
        if (minMintFee == 0) {
            assertEq(openingFee, 0);
        } else {
            assertEq(openingFee, SMALL_AMOUNT * minMintFee / FEE_PRECISION);
        }

        assetOracle.set(maxMintFeeStart - 1); // less than `maxMintFeeStart`
        openingFee = mainBB.computeVariableOpeningFee(SMALL_AMOUNT);
        if (maxMintFee == 0) {
            assertEq(openingFee, 0);
        } else {
            assertEq(openingFee, SMALL_AMOUNT * maxMintFee / FEE_PRECISION);
        }

        uint256 exchangeRate = (MAX_MINT_FEE_START + MIN_MINT_FEE_START) / 2;
        assetOracle.set(exchangeRate); // between `maxMintFeeStart` and `minMintFeeStart`
        openingFee = mainBB.computeVariableOpeningFee(SMALL_AMOUNT);
        uint256 fee = maxMintFee- (((exchangeRate - maxMintFeeStart) * (maxMintFee - minMintFee)) / (minMintFeeStart - maxMintFeeStart));
        if (fee > maxMintFee) {
            fee = maxMintFee == 0 ? 0 : (SMALL_AMOUNT * maxMintFee) / FEE_PRECISION;
            assertEq(openingFee, fee);
        }
        if (fee < minMintFee) { 
            fee = minMintFee == 0 ? 0 : (SMALL_AMOUNT * minMintFee) / FEE_PRECISION;
            assertEq(openingFee, fee);
        }
        if (fee > 0) {
            assertEq(openingFee, (SMALL_AMOUNT * fee) / FEE_PRECISION);
        }

        // **** Secondary BB market ****
        minMintFeeStart = secondaryBB.minMintFeeStart();
        maxMintFeeStart = secondaryBB.maxMintFeeStart();
        minMintFee = secondaryBB.minMintFee();
        maxMintFee = secondaryBB.maxMintFee();

        assetOracle.set(minMintFeeStart + 1); // greater than `minMintFeeStart`
        openingFee = secondaryBB.computeVariableOpeningFee(SMALL_AMOUNT);
        if (minMintFee == 0) {
            assertEq(openingFee, 0);
        } else {
            assertEq(openingFee, SMALL_AMOUNT * minMintFee / FEE_PRECISION);
        }

        assetOracle.set(maxMintFeeStart - 1); // less than `maxMintFeeStart`
        openingFee = secondaryBB.computeVariableOpeningFee(SMALL_AMOUNT);
        if (maxMintFee == 0) {
            assertEq(openingFee, 0);
        } else {
            assertEq(openingFee, SMALL_AMOUNT * maxMintFee / FEE_PRECISION);
        }

        exchangeRate = (MAX_MINT_FEE_START + MIN_MINT_FEE_START) / 2;
        assetOracle.set(exchangeRate); // between `maxMintFeeStart` and `minMintFeeStart`
        openingFee = secondaryBB.computeVariableOpeningFee(SMALL_AMOUNT);
        fee = maxMintFee- (((exchangeRate - maxMintFeeStart) * (maxMintFee - minMintFee)) / (minMintFeeStart - maxMintFeeStart));
        if (fee > maxMintFee) {
            fee = maxMintFee == 0 ? 0 : (SMALL_AMOUNT * maxMintFee) / FEE_PRECISION;
            assertEq(openingFee, fee);
        }
        if (fee < minMintFee) { 
            fee = minMintFee == 0 ? 0 : (SMALL_AMOUNT * minMintFee) / FEE_PRECISION;
            assertEq(openingFee, fee);
        }
        if (fee > 0) {
            assertEq(openingFee, (SMALL_AMOUNT * fee) / FEE_PRECISION);
        }
    }

    function test_WhenGetDebtRateIsCalled() external {
        // **** Main BB market ****
        BBDebtRateHelper rateHelper = BBDebtRateHelper(mainBB.debtRateHelper());

        uint256 val = rateHelper.getDebtRate(
            IBigBangDebtRateHelper.DebtRateCall({
                isMainMarket: true,
                penrose: IPenrose(address(penrose)),
                elastic: SMALL_AMOUNT,
                debtRateAgainstEthMarket: 0,
                maxDebtRate: BB_MAX_DEBT_RATE,
                minDebtRate: BB_MIN_DEBT_RATE
            })
        );
        assertGt(val, 0);

        // **** Secondary BB market ****
        // non-main market; elastic 0
        val = rateHelper.getDebtRate(
            IBigBangDebtRateHelper.DebtRateCall({
                isMainMarket: false,
                penrose: IPenrose(address(penrose)),
                elastic: 0,
                debtRateAgainstEthMarket: BB_DEBT_RATE_AGAINST_MAIN_MARKET,
                maxDebtRate: BB_MAX_DEBT_RATE,
                minDebtRate: BB_MIN_DEBT_RATE
            })
        );
        assertEq(val, BB_MIN_DEBT_RATE);

        // non-main market; elastic > 0
        val = rateHelper.getDebtRate(
            IBigBangDebtRateHelper.DebtRateCall({
                isMainMarket: false,
                penrose: IPenrose(address(penrose)),
                elastic: SMALL_AMOUNT,
                debtRateAgainstEthMarket: BB_DEBT_RATE_AGAINST_MAIN_MARKET,
                maxDebtRate: BB_MAX_DEBT_RATE,
                minDebtRate: BB_MIN_DEBT_RATE
            })
        );
        assertGt(val, 0);
    }

    function test_RevertWhen_ComputeVariableOpeningFeeAndOracleIsNotWorking() external {
        assetOracle.setSuccess(false);

        // **** Main BB market ****
        // OracleCallFailed
        vm.expectRevert(BBCommon.OracleCallFailed.selector);
        mainBB.computeVariableOpeningFee(LARGE_AMOUNT);

        // **** Secondary BB market ****
        // OracleCallFailed
        vm.expectRevert(BBCommon.OracleCallFailed.selector);
        secondaryBB.computeVariableOpeningFee(LARGE_AMOUNT);
    }
}
