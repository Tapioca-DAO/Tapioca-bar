// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// mocks
import {OracleMock_test} from "../../mocks/OracleMock_test.sol";

// external
import {BBDebtRateHelper} from "contracts/markets/bigBang/BBDebtRateHelper.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";

import {Markets_Unit_Shared} from "./Markets_Unit_Shared.t.sol";

abstract contract BigBang_Unit_Shared is Markets_Unit_Shared {
    MarketHelper public marketHelper;

    function setUp() public virtual override {
        super.setUp();
        marketHelper = new MarketHelper();
    }

    function _setPenroseBigBangDefaults(address mainBBMarket) internal {
        __setBigBangDefaults(mainBBMarket);

        penrose.setBigBangEthMarket(mainBBMarket);
        penrose.setBigBangEthMarketDebtRate(0.5 ether);
    }

    function _setSecondaryBigBangDefaults(address bb) internal {
        __setBigBangDefaults(bb);
    }

    function __setBigBangDefaults(address bb) private {
        BBDebtRateHelper debtHelper = new BBDebtRateHelper();
        OracleMock_test assetOracle = new OracleMock_test("A", "A", 0.5 ether);

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, address(debtHelper));
        penrose.executeMarketFn(mc, data, true);

        data[0] = abi.encodeWithSelector(BigBang.setAssetOracle.selector, address(assetOracle), "0x");
        penrose.executeMarketFn(mc, data, true);

        usdo.setMinterStatus(bb, true);
        usdo.setBurnerStatus(bb, true);
    }

    function _registerSecondaryDefaultBigBang() internal returns (address) {
        address rndAddr = makeAddr("rndAddress");
        BigBang bbMc = new BigBang();
        penrose.registerBigBangMasterContract(address(bbMc), IPenrose.ContractType.lowRisk);
        penrose.setUsdoToken(address(usdo), usdoId);

        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(
            TestBigBangData(
                address(penrose),
                address(nonMainToken), //collateral
                nonMainTokenId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(address(rndAddr)),
                0.2 ether,
                0.005 ether,
                0.05 ether
            )
        );

        address _contract =
            penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        return _contract;
    }

    function _registerDefaultBigBang() internal returns (address) {
        address rndAddr = makeAddr("rndAddress");

        BigBang bbMc = new BigBang();
        penrose.registerBigBangMasterContract(address(bbMc), IPenrose.ContractType.lowRisk);
        penrose.setUsdoToken(address(usdo), usdoId);

        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(
            TestBigBangData(
                address(penrose),
                address(mainToken), //collateral
                mainTokenId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(address(rndAddr)),
                0,
                0,
                0
            )
        );
        address _contract =
            penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        return _contract;
    }
}
