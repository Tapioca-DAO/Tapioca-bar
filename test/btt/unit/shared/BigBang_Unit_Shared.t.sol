// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// mocks
import {OracleMock_test} from "../../mocks/OracleMock_test.sol";

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
import {Markets_Unit_Shared} from "./Markets_Unit_Shared.t.sol";

abstract contract BigBang_Unit_Shared is Markets_Unit_Shared {
    // ************ //
    // *** VARS *** //
    // ************ //
    OracleMock_test assetOracle; // BigBang assets oracle (USDC <> USDO equivalent)
    BBDebtRateHelper debtHelper; // BigBang Debt rate helper

    BigBang bbMc;
    BigBang mainBB;
    BigBang secondaryBB;

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public virtual override {
        super.setUp();

        // create default BigBang oracle
        assetOracle = _createOracle("Asset oracle");

        // create default BB master contract
        bbMc = new BigBang();
        penrose.registerBigBangMasterContract(address(bbMc), IPenrose.ContractType.lowRisk);

        // create BBDebtRateHelper
        debtHelper = new BBDebtRateHelper();

        // create main BB market
        // it handles after deployment set-up
        mainBB = BigBang(payable(_registerBBMarket(address(mainToken), mainTokenId, true)));

        // create another BB market
        // it handles after deployment set-up
        secondaryBB = BigBang(payable(_registerBBMarket(address(randomCollateral), randomCollateralId, false)));
    }

    // **************** //
    // *** INTERNAL *** //
    // **************** //

    function _getBigBangInitData(BigBangInitData memory _bb)
        internal
        returns (
            BigBang._InitMemoryModulesData memory modulesData,
            BigBang._InitMemoryDebtData memory debtData,
            BigBang._InitMemoryData memory data
        )
    {
        BBCollateral bbCollateral = new BBCollateral();
        BBLiquidation bbLiq = new BBLiquidation();
        BBLeverage bbLev = new BBLeverage();
        BBBorrow bbBorrow = new BBBorrow();

        modulesData =
            BigBang._InitMemoryModulesData(address(bbLiq), address(bbBorrow), address(bbCollateral), address(bbLev));

        debtData = BigBang._InitMemoryDebtData(_bb.debtRateAgainstEth, _bb.debtRateMin, _bb.debtRateMax);

        data = BigBang._InitMemoryData(
            IPenrose(_bb.penrose),
            IERC20(_bb.collateral),
            _bb.collateralId,
            ITapiocaOracle(address(_bb.oracle)),
            DEFAULT_EXCHANGE_RATE,
            COLLATERALIZATION_RATE,
            LIQUIDATION_COLLATERALIZATION_RATE,
            _bb.leverageExecutor
        );
    }

    function _registerBBMarket(address _collateral, uint256 _collateralId, bool _isMain) internal returns (address) {
        // *** DEPLOYMENT *** //
        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(
            BigBangInitData(
                address(penrose),
                _collateral, //collateral
                _collateralId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(makeAddr("rndAddress")),
                _isMain ? VALUE_ZERO : BB_DEBT_RATE_AGAINST_MAIN_MARKET,
                _isMain ? VALUE_ZERO : BB_MIN_DEBT_RATE,
                _isMain ? VALUE_ZERO : BB_MAX_DEBT_RATE
            )
        );

        address _contract =
            penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // *** AFTER DEPLOYMENT *** //
        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = _contract;
        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, address(debtHelper));
        penrose.executeMarketFn(mc, data, true);

        data[0] = abi.encodeWithSelector(BigBang.setAssetOracle.selector, address(assetOracle), "0x");
        penrose.executeMarketFn(mc, data, true);

        usdo.setMinterStatus(_contract, true);
        usdo.setBurnerStatus(_contract, true);

        if (_isMain) {
            penrose.setBigBangEthMarket(_contract);
        }

        return _contract;
    }

}
