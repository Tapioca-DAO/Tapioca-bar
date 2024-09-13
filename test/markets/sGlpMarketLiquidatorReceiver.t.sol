// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {SGlpMarketLiquidatorReceiver} from "contracts/liquidators/SGlpMarketLiquidatorReceiver.sol";
import {SToftInfo, SLeverageSwapData} from "contracts/markets/leverage/BaseLeverageExecutor.sol";
// import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {ZeroXSwapperMockTarget} from "../mocks/ZeroXSwapperMockTarget.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";
import {Cluster} from "tap-utils/Cluster/Cluster.sol";
import {SavingsDaiMock} from "../mocks/SavingsDaiMock.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {SwapperMock} from "../mocks/SwapperMock.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

import {IGmxRewardRouterV2} from "tap-utils/interfaces/external/gmx/IGmxRewardRouterV2.sol";
import {IGmxGlpManager} from "tap-utils/interfaces/external/gmx/IGmxGlpManager.sol";
import {IZeroXSwapper} from "tap-utils/interfaces/periph/IZeroXSwapper.sol";
import {Pearlmit, IPearlmit} from "tap-utils/pearlmit/Pearlmit.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {ZeroXSwapper} from "tap-utils/Swapper/ZeroXSwapper.sol";
import {GmxMarketMock} from "../mocks/GmxMarketMock.sol";
import {TOFTMock} from "../mocks/TOFTMock.sol";
import {BaseLiquidatorReceiverTest} from "./BaseLiquidatorReceiverTest.t.sol";

import "forge-std/Test.sol";

contract sGlpMarketLiquidatorReceiverTest is BaseLiquidatorReceiverTest {
    ERC20Mock weth;
    ERC20Mock usdc;
    ERC20Mock usdo;
    ERC20Mock sGlp;
    TOFTMock collateral;
    SGlpMarketLiquidatorReceiver receiver;
    YieldBox yieldBox;
    Cluster cluster;
    Pearlmit pearlmit;

    uint256 usdcYieldBoxId;
    uint256 wethYieldBoxId;
    uint256 glpYieldBoxId;
    uint256 collateralYieldBoxId;

    ZeroXSwapperMockTarget swapperTarget;
    ZeroXSwapper swapper;

    GmxMarketMock gmxMock;
    function setUp() public {
        pearlmit = new Pearlmit("Test", "1", address(this), 0);
        {
            weth = new ERC20Mock("weth", "weth");
            vm.label(address(weth), "weth");

            usdc = new ERC20Mock("usdc", "usdc");
            vm.label(address(usdc), "usdc");

            usdo = new ERC20Mock("usdo", "usdo");
            vm.label(address(usdo), "usdo");

            sGlp = new ERC20Mock("sGlp", "sGlp");
            vm.label(address(sGlp), "sGlp");

            collateral = new TOFTMock(address(sGlp), IPearlmit(address(pearlmit)));
            vm.label(address(collateral), "collateral");

            gmxMock = new GmxMarketMock(address(0), address(0), address(0));
            gmxMock.setGlp(address(sGlp));
        }
        {
            YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();
            yieldBox = new YieldBox(IWrappedNative(address(0)), uriBuilder, pearlmit, address(this));

            ERC20WithoutStrategy usdcStrategy = createEmptyStrategy(address(yieldBox), address(usdc));
            usdcYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(usdc), IStrategy(address(usdcStrategy)), 0);

            ERC20WithoutStrategy wethStrategy = createEmptyStrategy(address(yieldBox), address(weth));
            wethYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(weth), IStrategy(address(wethStrategy)), 0);

            ERC20WithoutStrategy glpStrategy = createEmptyStrategy(address(yieldBox), address(sGlp));
            glpYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(sGlp), IStrategy(address(glpStrategy)), 0);

            ERC20WithoutStrategy collateralStrategy = createEmptyStrategy(address(yieldBox), address(collateral));
            collateralYieldBoxId =
                yieldBox.registerAsset(TokenType.ERC20, address(collateral), IStrategy(address(collateralStrategy)), 0);
        }

        {
            cluster = new Cluster(0, address(this));

            swapperTarget = new ZeroXSwapperMockTarget();
            swapper = new ZeroXSwapper(address(swapperTarget), ICluster(address(cluster)), address(this));

            receiver = new SGlpMarketLiquidatorReceiver(address(weth), ICluster(address(cluster)), address(swapper), IGmxRewardRouterV2(address(gmxMock)), IGmxGlpManager(address(gmxMock)), address(this));
        }

        {
            cluster.setRoleForContract(address(receiver),  keccak256("SWAP_EXECUTOR"), true);
            cluster.setRoleForContract(address(receiver),  keccak256("sGLPMARKET_LIQUIDATOR_RECEIVER"), true);
            cluster.setRoleForContract(address(this),  keccak256("sGLPMARKET_LIQUIDATOR_RECEIVER_CALLER"), true);

            receiver.setAllowedParticipant(address(this), true);
            vm.label(address(cluster), "cluster");
            vm.label(address(receiver), "receiver");
            vm.label(address(swapper), "swapper");
            vm.label(address(swapperTarget), "swapperTarget");
            vm.label(address(yieldBox), "yieldBox");
        }
    }

    function test_sGlpreceiver() public {
        uint256 testAmount = 1 ether;
        uint256 minAmountOut = 1 ether;

        // struct SSwapData {
        //     uint256 minAmountOut;
        //     IZeroXSwapper.SZeroXSwapData data;
        // }

        // struct SGlpSwapData {
        //     SSwapData zeroXswapData;
        //     // Token to swap tsGlp > token > Usdo.
        //     address token;
        //     // Min amount of tokens to receive after a sell GLP swap
        //     uint256 minAmountOut;
        // }

        deal(address(collateral), address(receiver), testAmount); // for unwrap
        deal(address(sGlp), address(collateral), testAmount); // for unwrap
        deal(address(usdo), address(swapperTarget), testAmount); // for usdc <> usdo swap
        deal(address(usdc), address(gmxMock), testAmount); // for sGLp unstake


        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(usdc)),
            buyToken: IERC20(address(usdo)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                ZeroXSwapperMockTarget.transferTokensWithDust.selector, address(usdc), address(usdo), testAmount, minAmountOut
            )
        });

        SGlpMarketLiquidatorReceiver.SGlpSwapData memory data = SGlpMarketLiquidatorReceiver.SGlpSwapData({
            token: address(usdc),
            minAmountOut: 0,
            zeroXswapData: SGlpMarketLiquidatorReceiver.SSwapData({
                minAmountOut: minAmountOut,
                data: zeroXSwapData
            })
        });

        uint256 usdoBalanceBefore = usdo.balanceOf(address(this));
        receiver.onCollateralReceiver(address(this), address(collateral), address(usdo), testAmount, abi.encode(data));
        uint256 usdoBalanceAfter = usdo.balanceOf(address(this));

        assertGt(usdoBalanceAfter, usdoBalanceBefore);
        assertEq(usdoBalanceAfter, minAmountOut);
    }

    function test_sGlpreceiver_minAmount() public {
        uint256 testAmount = 1 ether;
        uint256 minAmountOut = 0.9 ether;

        deal(address(collateral), address(receiver), testAmount); // for unwrap
        deal(address(sGlp), address(collateral), testAmount); // for unwrap
        deal(address(usdo), address(swapperTarget), testAmount); // for usdc <> usdo swap
        deal(address(usdc), address(gmxMock), testAmount); // for sGLp unstake

        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(usdc)),
            buyToken: IERC20(address(usdo)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                ZeroXSwapperMockTarget.transferTokensWithDust.selector, address(usdc), address(usdo), testAmount, minAmountOut
            )
        });

        SGlpMarketLiquidatorReceiver.SGlpSwapData memory data = SGlpMarketLiquidatorReceiver.SGlpSwapData({
            token: address(usdc),
            minAmountOut: 0,
            zeroXswapData: SGlpMarketLiquidatorReceiver.SSwapData({
                minAmountOut: minAmountOut,
                data: zeroXSwapData
            })
        });

        uint256 usdoBalanceBefore = usdo.balanceOf(address(this));
        receiver.onCollateralReceiver(address(this), address(collateral), address(usdo), testAmount, abi.encode(data));
        uint256 usdoBalanceAfter = usdo.balanceOf(address(this));

        assertGt(usdoBalanceAfter, usdoBalanceBefore);
        assertEq(usdoBalanceAfter, minAmountOut);
    }
}