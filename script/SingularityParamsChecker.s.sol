// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import "forge-std/Script.sol";
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import "./utils/ParamsCheckerUtils.sol";

contract SingularityParamsChecker is Script, ParamsCheckerUtils {
    address payable public constant SINGULARITY_ADDR = payable(0);

    address public constant EXPECTED_PENROSE = address(0);
    address public constant EXPECTED_COLLATERAL = address(0);
    uint256 public constant EXPECTED_COLLATERAL_ID = 1;
    address public constant EXPECTED_ORACLE = address(0);
    address public constant EXPECTED_LEVERAGE_EXECUTOR = address(0);
    uint256 public constant EXPECTED_CR = 1;
    uint256 public constant EXPECTED_LCR = 1;
    uint256 public constant EXPECTED_MIN_INTEREST_PER_SECOND = 1;
    uint256 public constant EXPECTED_MAX_INTEREST_PER_SECOND = 1;
    uint256 public constant EXPECTED_PROTOCOL_FEE = 1;
    uint256 public constant EXPECTED_OPENING_FEE = 1;
    uint256 public constant EXPECTED_INTERESET_ELASTICITY = 1;
    uint256 public constant EXPECTED_LIQUIDATION_MULTIPLIER = 1;
    uint256 public constant EXPECTED_MIN_LIQUIDATOR_REWARD = 1;
    uint256 public constant EXPECTED_MAX_LIQUIDATOR_REWARD = 1;
    uint256 public constant EXPECTED_LIQUIDATION_BONUS_AMOUNT = 1;
    uint256 public constant EXPECTED_MIN_TARGET_UTILIZATION = 1;
    uint256 public constant EXPECTED_MAX_TARGET_UTILIZATION = 1;
    uint256 public constant EXPECTED_EXCHANGE_RATE_PRECISION = 1;

    struct SingularityCheckResult {
        string penrose;
        string collateral;
        uint256 collateralId;
        string oracle;
        string leverageExecutor;
        uint256 collateralizationRate;
        uint256 liquidationCollateralizationRate;
        uint256 minimumInterestPerSecond;
        uint256 maximumInterestPerSecond;
        uint256 protocolFee;
        uint256 borrowOpeningFee;
        uint256 liquidationMultiplier;
        uint256 minLiquidatorReward;
        uint256 maxLiquidatorReward;
        uint256 liquidationBonusAmount;
        uint256 minimumTargetUtilization;
        uint256 maximumTargetUtilization;
        uint256 exchangeRatePrecision;
    }

    struct SingularityExpectedValues {
        string expectedPenrose;
        string expectedCollateral;
        uint256 expectedCollateralId;
        string expectedOracle;
        string expectedLeverageExecutor;
        uint256 expectedCollateralizationRate;
        uint256 expectedLiquidationCollateralizationRate;
        uint256 expectedMinimumInterestPerSecond;
        uint256 expectedMaximumInterestPerSecond;
        uint256 expectedProtocolFee;
        uint256 expectedBorrowOpeningFee;
        uint256 expectedLiquidationMultiplier;
        uint256 expectedMinLiquidatorReward;
        uint256 expectedMaxLiquidatorReward;
        uint256 expectedLiquidationBonusAmount;
        uint256 expectedMinimumTargetUtilization;
        uint256 expectedMaximumTargetUtilization;
        uint256 expectedExchangeRatePrecision;
    }

    struct SingularityDifference {
        bool penroseIsDifferent;
        bool collateralIsDifferent;
        bool collateralIdIsDifferent;
        bool oracleIsDifferent;
        bool leverageExecutorIsDifferent;
        bool collateralizationRateIsDifferent;
        bool liquidationCollateralizationRateIsDifferent;
        bool minimumInterestPerSecondIsDifferent;
        bool maximumInterestPerSecondIsDifferent;
        bool protocolFeeIsDifferent;
        bool borrowOpeningFeeIsDifferent;
        bool liquidationMultiplierIsDifferent;
        bool minLiquidatorRewardIsDifferent;
        bool maxLiquidatorRewardIsDifferent;
        bool liquidationBonusAmountIsDifferent;
        bool minimumTargetUtilizationIsDifferent;
        bool maximumTargetUtilizationIsDifferent;
        bool exchangeRatePrecisionIsDifferent;
    }

    function run() external {
        Singularity sgl = Singularity(payable(SINGULARITY_ADDR));

        SingularityCheckResult memory result = _checkSingularity(sgl);
        SingularityExpectedValues memory expected = _getExpectedValues();
        SingularityDifference memory differences = _checkDifferences(result, expected);

        string memory json = _constructJson(result, expected, differences);
        vm.writeFile(string(abi.encodePacked("singularity_", addressToString(SINGULARITY_ADDR), "_result.json")), json);
    }

    function _checkSingularity(Singularity sgl) private view returns (SingularityCheckResult memory result) {
        result.penrose = addressToString(address(sgl._penrose()));
        result.collateral = addressToString(address(sgl._collateral()));
        result.collateralId = sgl._collateralId();
        result.oracle = addressToString(address(sgl._oracle()));
        result.leverageExecutor = addressToString(address(sgl._leverageExecutor()));
        result.collateralizationRate = sgl._collateralizationRate();
        result.liquidationCollateralizationRate = sgl._liquidationCollateralizationRate();
        result.minimumInterestPerSecond = sgl.minimumInterestPerSecond();
        result.maximumInterestPerSecond = sgl.maximumInterestPerSecond();
        result.protocolFee = sgl._protocolFee();
        result.borrowOpeningFee = sgl.borrowOpeningFee();
        result.liquidationMultiplier = sgl._liquidationMultiplier();
        result.minLiquidatorReward = sgl._minLiquidatorReward();
        result.maxLiquidatorReward = sgl._maxLiquidatorReward();
        result.liquidationBonusAmount = sgl._liquidationBonusAmount();
        result.minimumTargetUtilization = sgl.minimumTargetUtilization();
        result.maximumTargetUtilization = sgl.maximumTargetUtilization();
        result.exchangeRatePrecision = sgl._exchangeRatePrecision();
    }

    function _getExpectedValues() private pure returns (SingularityExpectedValues memory expected) {
        expected.expectedPenrose = addressToString(EXPECTED_PENROSE);
        expected.expectedCollateral = addressToString(EXPECTED_COLLATERAL);
        expected.expectedCollateralId = EXPECTED_COLLATERAL_ID;
        expected.expectedOracle = addressToString(EXPECTED_ORACLE);
        expected.expectedLeverageExecutor = addressToString(EXPECTED_LEVERAGE_EXECUTOR);
        expected.expectedCollateralizationRate = EXPECTED_CR;
        expected.expectedLiquidationCollateralizationRate = EXPECTED_LCR;
        expected.expectedMinimumInterestPerSecond = EXPECTED_MIN_INTEREST_PER_SECOND;
        expected.expectedMaximumInterestPerSecond = EXPECTED_MAX_INTEREST_PER_SECOND;
        expected.expectedProtocolFee = EXPECTED_PROTOCOL_FEE;
        expected.expectedBorrowOpeningFee = EXPECTED_OPENING_FEE;
        expected.expectedLiquidationMultiplier = EXPECTED_LIQUIDATION_MULTIPLIER;
        expected.expectedMinLiquidatorReward = EXPECTED_MIN_LIQUIDATOR_REWARD;
        expected.expectedMaxLiquidatorReward = EXPECTED_MAX_LIQUIDATOR_REWARD;
        expected.expectedLiquidationBonusAmount = EXPECTED_LIQUIDATION_BONUS_AMOUNT;
        expected.expectedMinimumTargetUtilization = EXPECTED_MIN_TARGET_UTILIZATION;
        expected.expectedMaximumTargetUtilization = EXPECTED_MAX_TARGET_UTILIZATION;
        expected.expectedExchangeRatePrecision = EXPECTED_EXCHANGE_RATE_PRECISION;
    }

    function _checkDifferences(SingularityCheckResult memory result, SingularityExpectedValues memory expected)
        private
        pure
        returns (SingularityDifference memory differences)
    {
        differences.penroseIsDifferent =
            (keccak256(abi.encodePacked(result.penrose)) != keccak256(abi.encodePacked(expected.expectedPenrose)));
        differences.collateralIsDifferent =
            (keccak256(abi.encodePacked(result.collateral)) != keccak256(abi.encodePacked(expected.expectedCollateral)));
        differences.collateralIdIsDifferent = (result.collateralId != expected.expectedCollateralId);
        differences.oracleIsDifferent =
            (keccak256(abi.encodePacked(result.oracle)) != keccak256(abi.encodePacked(expected.expectedOracle)));
        differences.leverageExecutorIsDifferent = (
            keccak256(abi.encodePacked(result.leverageExecutor))
                != keccak256(abi.encodePacked(expected.expectedLeverageExecutor))
        );
        differences.collateralizationRateIsDifferent =
            (result.collateralizationRate != expected.expectedCollateralizationRate);
        differences.liquidationCollateralizationRateIsDifferent =
            (result.liquidationCollateralizationRate != expected.expectedLiquidationCollateralizationRate);
        differences.minimumInterestPerSecondIsDifferent =
            (result.minimumInterestPerSecond != expected.expectedMinimumInterestPerSecond);
        differences.maximumInterestPerSecondIsDifferent =
            (result.maximumInterestPerSecond != expected.expectedMaximumInterestPerSecond);
        differences.protocolFeeIsDifferent = (result.protocolFee != expected.expectedProtocolFee);
        differences.borrowOpeningFeeIsDifferent = (result.borrowOpeningFee != expected.expectedBorrowOpeningFee);
        differences.liquidationMultiplierIsDifferent =
            (result.liquidationMultiplier != expected.expectedLiquidationMultiplier);
        differences.minLiquidatorRewardIsDifferent =
            (result.minLiquidatorReward != expected.expectedMinLiquidatorReward);
        differences.maxLiquidatorRewardIsDifferent =
            (result.maxLiquidatorReward != expected.expectedMaxLiquidatorReward);
        differences.liquidationBonusAmountIsDifferent =
            (result.liquidationBonusAmount != expected.expectedLiquidationBonusAmount);
        differences.minimumTargetUtilizationIsDifferent =
            (result.minimumTargetUtilization != expected.expectedMinimumTargetUtilization);
        differences.maximumTargetUtilizationIsDifferent =
            (result.maximumTargetUtilization != expected.expectedMaximumTargetUtilization);
        differences.exchangeRatePrecisionIsDifferent =
            (result.exchangeRatePrecision != expected.expectedExchangeRatePrecision);
    }

    function _constructJson(
        SingularityCheckResult memory result,
        SingularityExpectedValues memory expected,
        SingularityDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                "{",
                _constructJsonMainFields(result, expected, differences),
                _constructJsonFeeFields(result, expected, differences),
                _constructJsonLiquidationFields(result, expected, differences),
                _constructJsonDebtRateFields(result, expected, differences),
                _constructJsonOracleFields(result, expected, differences),
                "}"
            )
        );
    }

    // Main fields: penrose, collateral, collateralId, leverageExecutor
    function _constructJsonMainFields(
        SingularityCheckResult memory result,
        SingularityExpectedValues memory expected,
        SingularityDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField("penrose", result.penrose, expected.expectedPenrose, differences.penroseIsDifferent),
                _constructJsonField(
                    "collateral", result.collateral, expected.expectedCollateral, differences.collateralIsDifferent
                ),
                _constructJsonField(
                    "collateralId",
                    uintToString(result.collateralId),
                    uintToString(expected.expectedCollateralId),
                    differences.collateralIdIsDifferent
                ),
                _constructJsonField(
                    "leverageExecutor",
                    result.leverageExecutor,
                    expected.expectedLeverageExecutor,
                    differences.leverageExecutorIsDifferent
                )
            )
        );
    }

    // Fee fields: protocolFee, borrowOpeningFee
    function _constructJsonFeeFields(
        SingularityCheckResult memory result,
        SingularityExpectedValues memory expected,
        SingularityDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField(
                    "protocolFee",
                    uintToString(result.protocolFee),
                    uintToString(expected.expectedProtocolFee),
                    differences.protocolFeeIsDifferent
                ),
                _constructJsonField(
                    "borrowOpeningFee",
                    uintToString(result.borrowOpeningFee),
                    uintToString(expected.expectedBorrowOpeningFee),
                    differences.borrowOpeningFeeIsDifferent
                )
            )
        );
    }

    // Liquidation fields: liquidationMultiplier, minLiquidatorReward, maxLiquidatorReward, liquidationBonusAmount
    function _constructJsonLiquidationFields(
        SingularityCheckResult memory result,
        SingularityExpectedValues memory expected,
        SingularityDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField(
                    "liquidationMultiplier",
                    uintToString(result.liquidationMultiplier),
                    uintToString(expected.expectedLiquidationMultiplier),
                    differences.liquidationMultiplierIsDifferent
                ),
                _constructJsonField(
                    "minLiquidatorReward",
                    uintToString(result.minLiquidatorReward),
                    uintToString(expected.expectedMinLiquidatorReward),
                    differences.minLiquidatorRewardIsDifferent
                ),
                _constructJsonField(
                    "maxLiquidatorReward",
                    uintToString(result.maxLiquidatorReward),
                    uintToString(expected.expectedMaxLiquidatorReward),
                    differences.maxLiquidatorRewardIsDifferent
                ),
                _constructJsonField(
                    "liquidationBonusAmount",
                    uintToString(result.liquidationBonusAmount),
                    uintToString(expected.expectedLiquidationBonusAmount),
                    differences.liquidationBonusAmountIsDifferent
                )
            )
        );
    }

    // Debt rate fields: collateralizationRate, liquidationCollateralizationRate, minimumInterestPerSecond, maximumInterestPerSecond
    function _constructJsonDebtRateFields(
        SingularityCheckResult memory result,
        SingularityExpectedValues memory expected,
        SingularityDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField(
                    "collateralizationRate",
                    uintToString(result.collateralizationRate),
                    uintToString(expected.expectedCollateralizationRate),
                    differences.collateralizationRateIsDifferent
                ),
                _constructJsonField(
                    "liquidationCollateralizationRate",
                    uintToString(result.liquidationCollateralizationRate),
                    uintToString(expected.expectedLiquidationCollateralizationRate),
                    differences.liquidationCollateralizationRateIsDifferent
                ),
                _constructJsonField(
                    "minimumInterestPerSecond",
                    uintToString(result.minimumInterestPerSecond),
                    uintToString(expected.expectedMinimumInterestPerSecond),
                    differences.minimumInterestPerSecondIsDifferent
                ),
                _constructJsonField(
                    "maximumInterestPerSecond",
                    uintToString(result.maximumInterestPerSecond),
                    uintToString(expected.expectedMaximumInterestPerSecond),
                    differences.maximumInterestPerSecondIsDifferent
                )
            )
        );
    }

    // Oracle fields: oracle, exchangeRatePrecision
    function _constructJsonOracleFields(
        SingularityCheckResult memory result,
        SingularityExpectedValues memory expected,
        SingularityDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField("oracle", result.oracle, expected.expectedOracle, differences.oracleIsDifferent),
                _constructJsonField(
                    "exchangeRatePrecision",
                    uintToString(result.exchangeRatePrecision),
                    uintToString(expected.expectedExchangeRatePrecision),
                    differences.exchangeRatePrecisionIsDifferent
                )
            )
        );
    }

    function _constructJsonField(
        string memory fieldName,
        string memory actual,
        string memory expected,
        bool isDifferent
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '"',
                fieldName,
                '": "',
                actual,
                '", ',
                '"',
                fieldName,
                'Expected": "',
                expected,
                '", ',
                '"',
                fieldName,
                'IsDifferent": ',
                isDifferent ? "true" : "false",
                ", "
            )
        );
    }
}
