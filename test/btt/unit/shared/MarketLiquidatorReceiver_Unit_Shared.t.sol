// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {Base_Test} from "../../Base_Test.t.sol";

// mocks
import {ZeroXSwapperMockTarget_test} from "../../mocks/ZeroXSwapperMockTarget_test.sol";
import {GmxMarketMock_test} from "../../mocks/GmxMarketMock_test.sol";
import {ERC20Mock_test} from "../../mocks/ERC20Mock_test.sol";
import {TOFTMock_test} from "../../mocks/TOFTMock_test.sol";

// contracts
import {SGlpMarketLiquidatorReceiver} from "contracts/liquidators/sGlpMarketLiquidatorReceiver.sol";
import {IGmxRewardRouterV2} from "tapioca-periph/interfaces/external/gmx/IGmxRewardRouterV2.sol";
import {MarketLiquidatorReceiver} from "contracts/liquidators/MarketLiquidatorReceiver.sol";
import {IGmxGlpManager} from "tapioca-periph/interfaces/external/gmx/IGmxGlpManager.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";

// dependencies
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {ZeroXSwapper} from "tapioca-periph/Swapper/ZeroXSwapper.sol";
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";

abstract contract MarketLiquidatorReceiver_Unit_Shared is Base_Test {
    ERC20Mock_test sGlp;
    ERC20Mock_test weth;
    TOFTMock_test tWeth;
    TOFTMock_test tSglp;
    uint256 wethYieldBoxId;
    ZeroXSwapper swapper;
    ZeroXSwapperMockTarget_test swapperTarget;
    MarketLiquidatorReceiver receiver;
    SGlpMarketLiquidatorReceiver sGlpReceiver;
    GmxMarketMock_test gmxMock;

    function setUp() public virtual override {
        super.setUp();

        sGlp = new ERC20Mock_test("sGlp", "sGlp");
        vm.label(address(sGlp), "sGlp Mock");

        tSglp = new TOFTMock_test(address(sGlp), IPearlmit(address(pearlmit)));
        vm.label(address(tSglp), "tSglp Mock");

        weth = new ERC20Mock_test("Wrapped Ethereum", "WETH");
        vm.label(address(weth), "WETH Mock");

        tWeth = new TOFTMock_test(address(weth), IPearlmit(address(pearlmit)));
        vm.label(address(tWeth), "tWETH Mock");

        swapperTarget = new ZeroXSwapperMockTarget_test();
        vm.label(address(swapperTarget), "ZeroXSwapperTarget Test");

        swapper = new ZeroXSwapper(address(swapperTarget), ICluster(address(cluster)), address(this));
        vm.label(address(swapper), "ZeroXSwapper Test");

        ERC20WithoutStrategy wethStrategy = _createEmptyStrategy(address(yieldBox), address(weth));
        wethYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(weth), IStrategy(address(wethStrategy)), 0);

        gmxMock = new GmxMarketMock_test(address(0), address(0), address(0));
        gmxMock.setGlp(address(sGlp));

        receiver =
            new MarketLiquidatorReceiver(address(weth), ICluster(address(cluster)), address(swapper), address(this));
        sGlpReceiver= new SGlpMarketLiquidatorReceiver(address(weth), ICluster(address(cluster)), address(swapper), IGmxRewardRouterV2(address(gmxMock)), IGmxGlpManager(address(gmxMock)), address(this));
    }
}
