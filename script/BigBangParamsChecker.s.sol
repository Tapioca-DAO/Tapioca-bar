// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import "forge-std/Script.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import "./utils/ParamsCheckerUtils.sol";

contract BigBangParamsChecker is Script, ParamsCheckerUtils {
    address payable public constant BIGBANG_ADDR = payable(0);

    address public constant EXPECTED_PENROSE = address(0);
    address public constant EXPECTED_COLLATERAL = address(0);
    uint256 public constant EXPECTED_COLLATERAL_ID = 1;
    address public constant EXPECTED_ORACLE = address(0);
    address public constant EXPECTED_LEVERAGE_EXECUTOR = address(0);
    uint256 public constant EXPECTED_CR = 1;
    uint256 public constant EXPECTED_LCR = 1;
    uint256 public constant EXPECTED_PROTOCOL_FEE = 1;
    uint256 public constant EXPECTED_LIQUIDATION_MULTIPLIER = 1;
    uint256 public constant EXPECTED_MIN_LIQUIDATOR_REWARD = 1;
    uint256 public constant EXPECTED_MAX_LIQUIDATOR_REWARD = 1;
    uint256 public constant EXPECTED_LIQUIDATION_BONUS_AMOUNT = 1;
    uint256 public constant EXPECTED_EXCHANGE_RATE_PRECISION = 1;

    uint256 public constant EXPECTED_DEBT_RATE_AGAINST_ETH = 1;
    uint256 public constant EXPECTED_MAX_DEBT_RATE = 1;
    uint256 public constant EXPECTED_MIN_DEBT_RATE = 1;
    uint256 public constant EXPECTED_MIN_MINT_FEE = 1;
    uint256 public constant EXPECTED_MAX_MINT_FEE = 1;
    uint256 public constant EXPECTED_MIN_MINT_FEE_START = 1;
    uint256 public constant EXPECTED_MAX_MINT_FEE_START = 1;
    address public constant EXPECTED_ASSET_ORACLE = address(0);

    struct BigBangCheckResult {
        string penrose;
        string collateral;
        string collateralId;
        string oracle;
        string leverageExecutor;
        string collateralizationRate;
        string liquidationCollateralizationRate;
        string protocolFee;
        string liquidationMultiplier;
        string minLiquidatorReward;
        string maxLiquidatorReward;
        string liquidationBonusAmount;
        string exchangeRatePrecision;
        string debtRateAgainstEthMarket;
        string maxDebtRate;
        string minDebtRate;
        string minMintFee;
        string maxMintFee;
        string maxMintFeeStart;
        string minMintFeeStart;
        string assetOracle;
    }

    struct BigBangExpectedValues {
        string penrose;
        string collateral;
        string collateralId;
        string oracle;
        string leverageExecutor;
        string collateralizationRate;
        string liquidationCollateralizationRate;
        string protocolFee;
        string liquidationMultiplier;
        string minLiquidatorReward;
        string maxLiquidatorReward;
        string liquidationBonusAmount;
        string exchangeRatePrecision;
        string debtRateAgainstEthMarket;
        string maxDebtRate;
        string minDebtRate;
        string minMintFee;
        string maxMintFee;
        string maxMintFeeStart;
        string minMintFeeStart;
        string assetOracle;
    }

    struct BigBangDifference {
        bool penroseIsDifferent;
        bool collateralIsDifferent;
        bool collateralIdIsDifferent;
        bool oracleIsDifferent;
        bool leverageExecutorIsDifferent;
        bool collateralizationRateIsDifferent;
        bool liquidationCollateralizationRateIsDifferent;
        bool protocolFeeIsDifferent;
        bool liquidationMultiplierIsDifferent;
        bool minLiquidatorRewardIsDifferent;
        bool maxLiquidatorRewardIsDifferent;
        bool liquidationBonusAmountIsDifferent;
        bool exchangeRatePrecisionIsDifferent;
        bool debtRateAgainstEthMarketIsDifferent;
        bool maxDebtRateIsDifferent;
        bool minDebtRateIsDifferent;
        bool minMintFeeIsDifferent;
        bool maxMintFeeIsDifferent;
        bool maxMintFeeStartIsDifferent;
        bool minMintFeeStartIsDifferent;
        bool assetOracleIsDifferent;
    }

    function run() external {
        BigBang bigBang = BigBang(BIGBANG_ADDR);

        BigBangCheckResult memory result = _checkBigBang(bigBang);
        BigBangExpectedValues memory expectedValues = _getExpectedValues();
        BigBangDifference memory differences = _checkDifferences(result, expectedValues);

        string memory strAddr = addressToString(BIGBANG_ADDR);
        string memory json = _constructJson(result, expectedValues, differences);
        vm.writeFile(string(abi.encodePacked("bigBang_", strAddr, "_result.json")), json);
    }

    function _checkBigBang(BigBang bigBang) private view returns (BigBangCheckResult memory result) {
        result.penrose = addressToString(address(bigBang._penrose()));
        result.collateral = addressToString(address(bigBang._collateral()));
        result.collateralId = uintToString(bigBang._collateralId());
        result.oracle = addressToString(address(bigBang._oracle()));
        result.leverageExecutor = addressToString(address(bigBang._leverageExecutor()));
        result.collateralizationRate = uintToString(bigBang._collateralizationRate());
        result.liquidationCollateralizationRate = uintToString(bigBang._liquidationCollateralizationRate());
        result.protocolFee = uintToString(bigBang._protocolFee());
        result.liquidationMultiplier = uintToString(bigBang._liquidationMultiplier());
        result.minLiquidatorReward = uintToString(bigBang._minLiquidatorReward());
        result.maxLiquidatorReward = uintToString(bigBang._maxLiquidatorReward());
        result.liquidationBonusAmount = uintToString(bigBang._liquidationBonusAmount());
        result.exchangeRatePrecision = uintToString(bigBang._exchangeRatePrecision());
        result.debtRateAgainstEthMarket = uintToString(bigBang.debtRateAgainstEthMarket());
        result.maxDebtRate = uintToString(bigBang.maxDebtRate());
        result.minDebtRate = uintToString(bigBang.minDebtRate());
        result.minMintFee = uintToString(bigBang.minMintFee());
        result.maxMintFee = uintToString(bigBang.maxMintFee());
        result.maxMintFeeStart = uintToString(bigBang.maxMintFeeStart());
        result.minMintFeeStart = uintToString(bigBang.minMintFeeStart());
        result.assetOracle = addressToString(address(bigBang.assetOracle()));
    }

    function _getExpectedValues() private pure returns (BigBangExpectedValues memory expected) {
        expected.penrose = addressToString(EXPECTED_PENROSE);
        expected.collateral = addressToString(EXPECTED_COLLATERAL);
        expected.collateralId = uintToString(EXPECTED_COLLATERAL_ID);
        expected.oracle = addressToString(EXPECTED_ORACLE);
        expected.leverageExecutor = addressToString(EXPECTED_LEVERAGE_EXECUTOR);
        expected.collateralizationRate = uintToString(EXPECTED_CR);
        expected.liquidationCollateralizationRate = uintToString(EXPECTED_LCR);
        expected.protocolFee = uintToString(EXPECTED_PROTOCOL_FEE);
        expected.liquidationMultiplier = uintToString(EXPECTED_LIQUIDATION_MULTIPLIER);
        expected.minLiquidatorReward = uintToString(EXPECTED_MIN_LIQUIDATOR_REWARD);
        expected.maxLiquidatorReward = uintToString(EXPECTED_MAX_LIQUIDATOR_REWARD);
        expected.liquidationBonusAmount = uintToString(EXPECTED_LIQUIDATION_BONUS_AMOUNT);
        expected.exchangeRatePrecision = uintToString(EXPECTED_EXCHANGE_RATE_PRECISION);
        expected.debtRateAgainstEthMarket = uintToString(EXPECTED_DEBT_RATE_AGAINST_ETH);
        expected.maxDebtRate = uintToString(EXPECTED_MAX_DEBT_RATE);
        expected.minDebtRate = uintToString(EXPECTED_MIN_DEBT_RATE);
        expected.minMintFee = uintToString(EXPECTED_MIN_MINT_FEE);
        expected.maxMintFee = uintToString(EXPECTED_MAX_MINT_FEE);
        expected.maxMintFeeStart = uintToString(EXPECTED_MAX_MINT_FEE_START);
        expected.minMintFeeStart = uintToString(EXPECTED_MIN_MINT_FEE_START);
        expected.assetOracle = addressToString(EXPECTED_ASSET_ORACLE);
    }

    function _checkDifferences(BigBangCheckResult memory result, BigBangExpectedValues memory expected)
        private
        pure
        returns (BigBangDifference memory differences)
    {
        differences.penroseIsDifferent =
            (keccak256(abi.encodePacked(result.penrose)) != keccak256(abi.encodePacked(expected.penrose)));
        differences.collateralIsDifferent =
            (keccak256(abi.encodePacked(result.collateral)) != keccak256(abi.encodePacked(expected.collateral)));
        differences.collateralIdIsDifferent =
            (keccak256(abi.encodePacked(result.collateralId)) != keccak256(abi.encodePacked(expected.collateralId)));
        differences.oracleIsDifferent =
            (keccak256(abi.encodePacked(result.oracle)) != keccak256(abi.encodePacked(expected.oracle)));
        differences.leverageExecutorIsDifferent = (
            keccak256(abi.encodePacked(result.leverageExecutor))
                != keccak256(abi.encodePacked(expected.leverageExecutor))
        );
        differences.collateralizationRateIsDifferent = (
            keccak256(abi.encodePacked(result.collateralizationRate))
                != keccak256(abi.encodePacked(expected.collateralizationRate))
        );
        differences.liquidationCollateralizationRateIsDifferent = (
            keccak256(abi.encodePacked(result.liquidationCollateralizationRate))
                != keccak256(abi.encodePacked(expected.liquidationCollateralizationRate))
        );
        differences.protocolFeeIsDifferent =
            (keccak256(abi.encodePacked(result.protocolFee)) != keccak256(abi.encodePacked(expected.protocolFee)));
        differences.liquidationMultiplierIsDifferent = (
            keccak256(abi.encodePacked(result.liquidationMultiplier))
                != keccak256(abi.encodePacked(expected.liquidationMultiplier))
        );
        differences.minLiquidatorRewardIsDifferent = (
            keccak256(abi.encodePacked(result.minLiquidatorReward))
                != keccak256(abi.encodePacked(expected.minLiquidatorReward))
        );
        differences.maxLiquidatorRewardIsDifferent = (
            keccak256(abi.encodePacked(result.maxLiquidatorReward))
                != keccak256(abi.encodePacked(expected.maxLiquidatorReward))
        );
        differences.liquidationBonusAmountIsDifferent = (
            keccak256(abi.encodePacked(result.liquidationBonusAmount))
                != keccak256(abi.encodePacked(expected.liquidationBonusAmount))
        );
        differences.exchangeRatePrecisionIsDifferent = (
            keccak256(abi.encodePacked(result.exchangeRatePrecision))
                != keccak256(abi.encodePacked(expected.exchangeRatePrecision))
        );
        differences.debtRateAgainstEthMarketIsDifferent = (
            keccak256(abi.encodePacked(result.debtRateAgainstEthMarket))
                != keccak256(abi.encodePacked(expected.debtRateAgainstEthMarket))
        );
        differences.maxDebtRateIsDifferent =
            (keccak256(abi.encodePacked(result.maxDebtRate)) != keccak256(abi.encodePacked(expected.maxDebtRate)));
        differences.minDebtRateIsDifferent =
            (keccak256(abi.encodePacked(result.minDebtRate)) != keccak256(abi.encodePacked(expected.minDebtRate)));
        differences.minMintFeeIsDifferent =
            (keccak256(abi.encodePacked(result.minMintFee)) != keccak256(abi.encodePacked(expected.minMintFee)));
        differences.maxMintFeeIsDifferent =
            (keccak256(abi.encodePacked(result.maxMintFee)) != keccak256(abi.encodePacked(expected.maxMintFee)));
        differences.maxMintFeeStartIsDifferent = (
            keccak256(abi.encodePacked(result.maxMintFeeStart)) != keccak256(abi.encodePacked(expected.maxMintFeeStart))
        );
        differences.minMintFeeStartIsDifferent = (
            keccak256(abi.encodePacked(result.minMintFeeStart)) != keccak256(abi.encodePacked(expected.minMintFeeStart))
        );
        differences.assetOracleIsDifferent =
            (keccak256(abi.encodePacked(result.assetOracle)) != keccak256(abi.encodePacked(expected.assetOracle)));
    }

    function _constructJson(
        BigBangCheckResult memory result,
        BigBangExpectedValues memory expected,
        BigBangDifference memory differences
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

    function _constructJsonMainFields(
        BigBangCheckResult memory result,
        BigBangExpectedValues memory expected,
        BigBangDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField("penrose", result.penrose, expected.penrose, differences.penroseIsDifferent),
                _constructJsonField(
                    "collateral", result.collateral, expected.collateral, differences.collateralIsDifferent
                ),
                _constructJsonField(
                    "collateralId", result.collateralId, expected.collateralId, differences.collateralIdIsDifferent
                ),
                _constructJsonField("oracle", result.oracle, expected.oracle, differences.oracleIsDifferent),
                _constructJsonField(
                    "leverageExecutor",
                    result.leverageExecutor,
                    expected.leverageExecutor,
                    differences.leverageExecutorIsDifferent
                ),
                _constructJsonField(
                    "collateralizationRate",
                    result.collateralizationRate,
                    expected.collateralizationRate,
                    differences.collateralizationRateIsDifferent
                ),
                _constructJsonField(
                    "liquidationCollateralizationRate",
                    result.liquidationCollateralizationRate,
                    expected.liquidationCollateralizationRate,
                    differences.liquidationCollateralizationRateIsDifferent
                )
            )
        );
    }

    function _constructJsonFeeFields(
        BigBangCheckResult memory result,
        BigBangExpectedValues memory expected,
        BigBangDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField(
                    "protocolFee", result.protocolFee, expected.protocolFee, differences.protocolFeeIsDifferent
                ),
                _constructJsonField(
                    "minLiquidatorReward",
                    result.minLiquidatorReward,
                    expected.minLiquidatorReward,
                    differences.minLiquidatorRewardIsDifferent
                ),
                _constructJsonField(
                    "maxLiquidatorReward",
                    result.maxLiquidatorReward,
                    expected.maxLiquidatorReward,
                    differences.maxLiquidatorRewardIsDifferent
                )
            )
        );
    }

    function _constructJsonLiquidationFields(
        BigBangCheckResult memory result,
        BigBangExpectedValues memory expected,
        BigBangDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField(
                    "liquidationBonusAmount",
                    result.liquidationBonusAmount,
                    expected.liquidationBonusAmount,
                    differences.liquidationBonusAmountIsDifferent
                ),
                _constructJsonField(
                    "exchangeRatePrecision",
                    result.exchangeRatePrecision,
                    expected.exchangeRatePrecision,
                    differences.exchangeRatePrecisionIsDifferent
                )
            )
        );
    }

    function _constructJsonDebtRateFields(
        BigBangCheckResult memory result,
        BigBangExpectedValues memory expected,
        BigBangDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField(
                    "debtRateAgainstEthMarket",
                    result.debtRateAgainstEthMarket,
                    expected.debtRateAgainstEthMarket,
                    differences.debtRateAgainstEthMarketIsDifferent
                ),
                _constructJsonField(
                    "maxDebtRate", result.maxDebtRate, expected.maxDebtRate, differences.maxDebtRateIsDifferent
                ),
                _constructJsonField(
                    "minDebtRate", result.minDebtRate, expected.minDebtRate, differences.minDebtRateIsDifferent
                )
            )
        );
    }

    function _constructJsonOracleFields(
        BigBangCheckResult memory result,
        BigBangExpectedValues memory expected,
        BigBangDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _constructJsonField(
                    "minMintFee", result.minMintFee, expected.minMintFee, differences.minMintFeeIsDifferent
                ),
                _constructJsonField(
                    "maxMintFee", result.maxMintFee, expected.maxMintFee, differences.maxMintFeeIsDifferent
                ),
                _constructJsonField(
                    "maxMintFeeStart",
                    result.maxMintFeeStart,
                    expected.maxMintFeeStart,
                    differences.maxMintFeeStartIsDifferent
                ),
                _constructJsonField(
                    "minMintFeeStart",
                    result.minMintFeeStart,
                    expected.minMintFeeStart,
                    differences.minMintFeeStartIsDifferent
                ),
                _constructJsonField(
                    "assetOracle", result.assetOracle, expected.assetOracle, differences.assetOracleIsDifferent
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
