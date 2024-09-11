// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// mocks
import {ZeroXSwapperMockTarget_test} from "../../mocks/ZeroXSwapperMockTarget_test.sol";
import {LeverageExecutorMock_test} from "../../mocks/LeverageExecutorMock_test.sol";
import {OracleMock_test} from "../../mocks/OracleMock_test.sol";
import {ERC20Mock_test} from "../../mocks/ERC20Mock_test.sol";
import {TOFTMock_test} from "../../mocks/TOFTMock_test.sol";

// Tapioca
import {MarketLiquidatorReceiver} from "contracts/liquidators/MarketLiquidatorReceiver.sol";
import {ZeroXSwapper} from "tap-utils/Swapper/ZeroXSwapper.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";

import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {IMarket} from "tap-utils/interfaces/bar/ISingularity.sol";
import {IPearlmit} from "tap-utils/pearlmit/Pearlmit.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";

// tests
import {Base_Test} from "../../Base_Test.t.sol";

abstract contract Markets_Unit_Shared is Base_Test {
    // ************ //
    // *** VARS *** //
    // ************ //
    ERC20Mock_test randomCollateralErc20;
    TOFTMock_test randomCollateral;
    uint256 randomCollateralId;

    OracleMock_test oracle; // main markets oracle

    MarketHelper public marketHelper;

    ZeroXSwapper swapper;
    ZeroXSwapperMockTarget_test swapperTarget;
    MarketLiquidatorReceiver liquidatorReceiver;

    LeverageExecutorMock_test leverageExecutor;

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public virtual override {
        super.setUp();

        marketHelper = new MarketHelper();

        // create default markets oracle
        oracle = _createOracle("Default oracle");

        // create leverage executor
        // mock to allow return value customization
        leverageExecutor = new LeverageExecutorMock_test();
        leverageExecutor.setOracle(ITapiocaOracle(address(oracle)));

        // create random collateral token
        randomCollateralErc20 = _createToken("RandomCollateral");

        randomCollateral = new TOFTMock_test(address(randomCollateralErc20), IPearlmit(address(pearlmit)));
        vm.label(address(randomCollateral), "RandomCollateral TOFT");

        // create YieldBox id for random token mock
        randomCollateralId = yieldBox.registerAsset(
            TokenType.ERC20,
            address(randomCollateral),
            IStrategy(address(_createEmptyStrategy(address(yieldBox), address(randomCollateral)))),
            0
        );

        swapperTarget = new ZeroXSwapperMockTarget_test();
        vm.label(address(swapperTarget), "ZeroXSwapperTarget Test");

        swapper = new ZeroXSwapper(address(swapperTarget), ICluster(address(cluster)), address(this));
        vm.label(address(swapper), "ZeroXSwapper Test");

        liquidatorReceiver =
            new MarketLiquidatorReceiver(address(mainToken), ICluster(address(cluster)), address(swapper), address(this));
        vm.label(address(liquidatorReceiver), "MarketLiquidatorReceiver Test");

        // *** AFTER DEPLOYMENT *** //
        liquidatorReceiver.setAllowedParticipant(address(this), true);
        cluster.updateContract(0, address(this), true);

        deal(address(mainTokenErc20), address(swapperTarget), type(uint128).max); // for liquidations
        deal(address(usdo), address(swapperTarget), type(uint128).max); // for liquidations

        deal(address(randomCollateralErc20), address(randomCollateral), type(uint128).max);


    }

    // **************** //
    // *** INTERNAL *** //
    // **************** //
    function _approveForCollateral(address) internal virtual  {}

    function _depositToYieldBox(address asset, uint256 id, uint256 share, address from, address to) internal resetPrank(from) {
        _approveViaERC20(asset, from, address(yieldBox), type(uint256).max);
        _approveViaERC20(asset, from, address(pearlmit), type(uint256).max);
        _approveYieldBoxForAll(yieldBox, from, address(pearlmit));

        yieldBox.depositAsset(id, from, to, 0, share);
    }

    function _computeMaxBorrowAmount(uint256 collateralAmount, IMarket market) internal view returns (uint256 inAssetAmount) {
        (, uint256 rate) = oracle.peek("");

        // `FEE_PRECISION` is constant for all markets
        inAssetAmount =
            (collateralAmount * (market._exchangeRatePrecision() / FEE_PRECISION) * market._collateralizationRate()) / rate;
    }

    
    function _executeFromPenrose(address market, bytes memory encodedData) internal {
        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(market);
        data[0] = encodedData;
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);
    }
}
