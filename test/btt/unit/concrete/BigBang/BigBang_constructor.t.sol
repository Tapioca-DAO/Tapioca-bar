// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// Tapioca
import {BBDebtRateHelper} from "contracts/markets/bigBang/BBDebtRateHelper.sol";
import {BBLiquidation} from "contracts/markets/bigBang/BBLiquidation.sol";
import {BBCollateral} from "contracts/markets/bigBang/BBCollateral.sol";
import {BBLeverage} from "contracts/markets/bigBang/BBLeverage.sol";
import {BBBorrow} from "contracts/markets/bigBang/BBBorrow.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_constructor is BigBang_Unit_Shared {
    function test_WhenBigBangIsCreatedWithTheRightParameters() external {
        // it should have asset as Usdo
        assertEq(address(mainBB._asset()), address(usdo));
        // it should have collateral as the main token
        assertEq(address(mainBB._collateral()), address(mainToken));
        // it should have oracle as shared one
        assertEq(address(mainBB._oracle()), address(oracle));
        // it should have assetId as the Usdo id registered in YieldBox
        assertEq(mainBB._assetId(), usdoId);
        // it should have collateralId as the main token id registered in YieldBox
        assertEq(mainBB._collateralId(), mainTokenId);
        // it should have protocolFee as the default one of 10000
        assertEq(mainBB._protocolFee(), PROTOCOL_FEE);
        // it should have collateralizationRate as the default one of 75000
        assertEq(mainBB._collateralizationRate(), COLLATERALIZATION_RATE);
        // it should have liquidationCollateralizationRate as the default one of 80000
        assertEq(mainBB._liquidationCollateralizationRate(), LIQUIDATION_COLLATERALIZATION_RATE);
        // it should have exchangeRatePrecision as the default one of 1e18
        assertEq(mainBB._exchangeRatePrecision(), DEFAULT_EXCHANGE_RATE);
        // it should have minLiquidatorReward as the default one of 88e3
        assertEq(mainBB._minLiquidatorReward(), MIN_LIQUIDATOR_REWARD);
        // it should have maxLiquidatorReward as the default one of 925e2
        assertEq(mainBB._maxLiquidatorReward(), MAX_LIQUIDATOR_REWARD);
        // it should have liquidationBonusAmount as the default one of 3e3
        assertEq(mainBB._liquidationBonusAmount(), LIQUIDATION_BONUS_AMOUNT);
        // it should have liquidationMultiplier as the default one of 12000
        assertEq(mainBB._liquidationMultiplier(), LIQUIDATION_MULTIPLIER);
        // it should have rateValidDuration as the default one of 24 hours
        assertEq(mainBB._rateValidDuration(), RATE_VALID_DURATION);
        // it should have minMintFee as the default one of 0
        assertEq(mainBB.minMintFee(), VALUE_ZERO);
        // it should have maxMintFee as the default one of 1000
        assertEq(mainBB.maxMintFee(), MAX_MINT_FEE);
        // it should have maxMintFeeStart as the default one of 980000000000000000
        assertEq(mainBB.maxMintFeeStart(), MAX_MINT_FEE_START);
        // it should have minMintFeeStart as the default one of 1000000000000000000
        assertEq(mainBB.minMintFeeStart(), MIN_MINT_FEE_START);
        // it should have minBorrowAmount as the default one of 1e15
        assertEq(mainBB._minBorrowAmount(), MIN_BORROW_AMOUNT);
        // it should have minCollateralAmount as the default one of 1e15
        assertEq(mainBB._minCollateralAmount(), MIN_COLLATERAL_AMOUNT);
        // it should transfer ownership to 'Penrose'
        assertEq(mainBB.owner(), address(penrose));
    }

    function test_RevertWhen_ParametersAreWrong() external {
        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getDefaultInitData();

        // it should revert for collateral
        initMemoryData._collateral = IERC20(ADDRESS_ZERO);
        vm.expectRevert(BigBang.BadPair.selector);
        penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // it should revert for oracle
        initMemoryData._collateral = IERC20(address(randomCollateral));
        initMemoryData._oracle = ITapiocaOracle(ADDRESS_ZERO);
        vm.expectRevert(BigBang.BadPair.selector);
        penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // CR
        initMemoryData._oracle = ITapiocaOracle(address(oracle));
        initMemoryData._collateralizationRate = FEE_PRECISION + 1;
        vm.expectRevert(BigBang.NotValid.selector);
        penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // LCR
        initMemoryData._collateralizationRate = COLLATERALIZATION_RATE;
        initMemoryData._liquidationCollateralizationRate = FEE_PRECISION + 1;
        vm.expectRevert(BigBang.NotValid.selector);
        penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // LCR < CR
        initMemoryData._liquidationCollateralizationRate = COLLATERALIZATION_RATE - 1;
        vm.expectRevert(BigBang.NotValid.selector);
        penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // Debt rate > max
        initMemoryData._liquidationCollateralizationRate = LIQUIDATION_COLLATERALIZATION_RATE;
        initDebtData._debtRateMax = 1e18 + 1;
        vm.expectRevert(BigBang.MaxDebtRateNotValid.selector);
        penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // Debt rate Max < Debt rate Min
        initDebtData._debtRateMax = initDebtData._debtRateMin;
        vm.expectRevert(BigBang.DebtRatesNotValid.selector);
        penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);
    }

    function _getDefaultInitData()
        private
        returns (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        )
    {
        (initModulesData, initDebtData, initMemoryData) = _getBigBangInitData(
            BigBangInitData(
                address(penrose),
                address(randomCollateral),
                randomCollateralId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(makeAddr("rndAddress")),
                VALUE_ZERO,
                VALUE_ZERO,
                VALUE_ZERO
            )
        );
    }
}
