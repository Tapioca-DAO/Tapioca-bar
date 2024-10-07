// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import "forge-std/Script.sol";
import {Penrose} from "contracts/Penrose.sol";
import "./utils/ParamsCheckerUtils.sol";

contract PenroseParamsChecker is Script, ParamsCheckerUtils {
    address public constant PENROSE_ADDR = address(0);

    address public constant EXPECTED_MAIN_TOKEN = address(0); //weth
    uint256 public constant EXPECTED_MAIN_TOKEN_ID = 1;
    address public constant EXPECTED_BB_ETH_MARKET = address(0);
    uint256 public constant EXPECTED_BB_ETH_MARKET_DEBT_RATE = 1;

    struct PenroseCheckResult {
        string cluster;
        string yieldBox;
        string bigBangEthMarket;
        string bigBangEthDebtRate;
        string tapToken;
        string usdoToken;
    }

    struct PenroseExpectedValues {
        string cluster;
        string yieldBox;
        string bigBangEthMarket;
        string bigBangEthDebtRate;
        string tapToken;
        string usdoToken;
    }

    struct PenroseDifference {
        bool clusterIsDifferent;
        bool yieldBoxIsDifferent;
        bool bigBangEthMarketIsDifferent;
        bool bigBangEthDebtRateIsDifferent;
        bool tapTokenIsDifferent;
        bool usdoTokenIsDifferent;
    }

    function run() external {
        Penrose penrose = Penrose(PENROSE_ADDR);

        PenroseCheckResult memory result = _checkPenrose(penrose);
        PenroseExpectedValues memory expectedValues = _getExpectedValues();
        PenroseDifference memory differences = _checkDifferences(result, expectedValues);

        string memory strAddr = addressToString(PENROSE_ADDR);
        string memory json = _constructJson(result, expectedValues, differences);
        vm.writeFile(string(abi.encodePacked("penrose_", strAddr, "_result.json")), json);
    }

    function _checkPenrose(Penrose penrose) private view returns (PenroseCheckResult memory result) {
        result.cluster = addressToString(address(penrose.cluster()));
        result.yieldBox = addressToString(address(penrose.yieldBox()));
        result.bigBangEthMarket = addressToString(address(penrose.bigBangEthMarket()));
        result.bigBangEthDebtRate = uintToString(penrose.bigBangEthDebtRate());
        result.tapToken = addressToString(address(penrose.tapToken()));
        result.usdoToken = addressToString(address(penrose.usdoToken()));
    }

    function _getExpectedValues() private pure returns (PenroseExpectedValues memory expected) {
        expected.cluster = addressToString(EXPECTED_CLUSTER);
        expected.yieldBox = addressToString(EXPECTED_YIELDBOX);
        expected.bigBangEthMarket = addressToString(EXPECTED_BB_ETH_MARKET);
        expected.bigBangEthDebtRate = uintToString(EXPECTED_BB_ETH_MARKET_DEBT_RATE);
        expected.tapToken = addressToString(EXPECTED_TAP);
        expected.usdoToken = addressToString(EXPECTED_USDO);
    }

    function _checkDifferences(PenroseCheckResult memory result, PenroseExpectedValues memory expected)
        private
        pure
        returns (PenroseDifference memory differences)
    {
        differences.clusterIsDifferent =
            (keccak256(abi.encodePacked(result.cluster)) != keccak256(abi.encodePacked(expected.cluster)));
        differences.yieldBoxIsDifferent =
            (keccak256(abi.encodePacked(result.yieldBox)) != keccak256(abi.encodePacked(expected.yieldBox)));
        differences.bigBangEthMarketIsDifferent = (
            keccak256(abi.encodePacked(result.bigBangEthMarket))
                != keccak256(abi.encodePacked(expected.bigBangEthMarket))
        );
        differences.bigBangEthDebtRateIsDifferent = (
            keccak256(abi.encodePacked(result.bigBangEthDebtRate))
                != keccak256(abi.encodePacked(expected.bigBangEthDebtRate))
        );
        differences.tapTokenIsDifferent =
            (keccak256(abi.encodePacked(result.tapToken)) != keccak256(abi.encodePacked(expected.tapToken)));
        differences.usdoTokenIsDifferent =
            (keccak256(abi.encodePacked(result.usdoToken)) != keccak256(abi.encodePacked(expected.usdoToken)));
    }

    function _constructJson(
        PenroseCheckResult memory result,
        PenroseExpectedValues memory expected,
        PenroseDifference memory differences
    ) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                "{",
                _constructJsonField("cluster", result.cluster, expected.cluster, differences.clusterIsDifferent),
                _constructJsonField("yieldBox", result.yieldBox, expected.yieldBox, differences.yieldBoxIsDifferent),
                _constructJsonField(
                    "bigBangEthMarket",
                    result.bigBangEthMarket,
                    expected.bigBangEthMarket,
                    differences.bigBangEthMarketIsDifferent
                ),
                _constructJsonField(
                    "bigBangEthDebtRate",
                    result.bigBangEthDebtRate,
                    expected.bigBangEthDebtRate,
                    differences.bigBangEthDebtRateIsDifferent
                ),
                _constructJsonField("tapToken", result.tapToken, expected.tapToken, differences.tapTokenIsDifferent),
                _constructJsonField("usdoToken", result.usdoToken, expected.usdoToken, differences.usdoTokenIsDifferent),
                "}"
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
