// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {
    AssetToSGLPLeverageExecutor,
    SGlpLeverageSwapData
} from "contracts/markets/leverage/AssetToSGLPLeverageExecutor.sol";
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
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";
import {SavingsDaiMock} from "../mocks/SavingsDaiMock.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {SwapperMock} from "../mocks/SwapperMock.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

import {IGmxRewardRouterV2} from "tapioca-periph/interfaces/external/gmx/IGmxRewardRouterV2.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {BaseLeverageExecutorTest} from "./BaseLeverageExecutorTest.t.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {ZeroXSwapper} from "tapioca-periph/Swapper/ZeroXSwapper.sol";
import {GmxMarketMock} from "../mocks/GmxMarketMock.sol";
import {TOFTMock} from "../mocks/TOFTMock.sol";

import "forge-std/Test.sol";

contract AssetToSGLPLeverageExecutorTest is BaseLeverageExecutorTest {
    ERC20Mock weth;
    ERC20Mock usdc;
    ERC20Mock glp;
    TOFTMock collateral;
    AssetToSGLPLeverageExecutor executor;
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
        pearlmit = new Pearlmit("Pearlmit", "1");
        {
            weth = new ERC20Mock("weth", "weth");
            vm.label(address(weth), "weth");

            usdc = new ERC20Mock("usdc", "usdc");
            vm.label(address(usdc), "usdc");

            glp = new ERC20Mock("glp", "glp");
            vm.label(address(glp), "glp");

            collateral = new TOFTMock(address(glp), IPearlmit(address(pearlmit)));
            vm.label(address(collateral), "collateral");

            gmxMock = new GmxMarketMock(address(0), address(0), address(0));
            gmxMock.setGlp(address(glp));
        }
        {
            YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();
            yieldBox = new YieldBox(IWrappedNative(address(0)), uriBuilder);

            ERC20WithoutStrategy usdcStrategy = createEmptyStrategy(address(yieldBox), address(usdc));
            usdcYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(usdc), IStrategy(address(usdcStrategy)), 0);

            ERC20WithoutStrategy wethStrategy = createEmptyStrategy(address(yieldBox), address(weth));
            wethYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(weth), IStrategy(address(wethStrategy)), 0);

            ERC20WithoutStrategy glpStrategy = createEmptyStrategy(address(yieldBox), address(glp));
            glpYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(glp), IStrategy(address(glpStrategy)), 0);

            ERC20WithoutStrategy collateralStrategy = createEmptyStrategy(address(yieldBox), address(collateral));
            collateralYieldBoxId =
                yieldBox.registerAsset(TokenType.ERC20, address(collateral), IStrategy(address(collateralStrategy)), 0);
        }

        {
            cluster = new Cluster(0, address(this));

            swapperTarget = new ZeroXSwapperMockTarget();
            swapper = new ZeroXSwapper(address(swapperTarget), ICluster(address(cluster)), address(this));


            executor = new AssetToSGLPLeverageExecutor(
                IZeroXSwapper(address(swapper)),
                ICluster(address(cluster)),
                IGmxRewardRouterV2(address(gmxMock)),
                address(0), 
                IPearlmit(address(pearlmit))
            );
        }

        {
            cluster.updateContract(0, address(this), true);
            cluster.updateContract(0, address(executor), true);
            cluster.updateContract(0, address(swapper), true);
            cluster.updateContract(0, address(swapperTarget), true);
            cluster.updateContract(0, address(yieldBox), true);
            cluster.updateContract(0, address(collateral), true);
            cluster.updateContract(0, address(glp), true);
            cluster.updateContract(0, address(usdc), true);
            cluster.updateContract(0, address(weth), true);
            cluster.updateContract(0, address(gmxMock), true);
            vm.label(address(cluster), "cluster");
            vm.label(address(executor), "executor");
            vm.label(address(swapper), "swapper");
            vm.label(address(swapperTarget), "swapperTarget");
            vm.label(address(yieldBox), "yieldBox");
        }
    }

    function test_get_collateral_glp() public {
        uint256 balanceBefore = glp.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 1 ether;

        deal(address(usdc), address(executor), amountIn);
        deal(address(usdc), address(swapperTarget), amountIn);
        deal(address(weth), address(swapperTarget), amountIn);
        deal(address(glp), address(executor), amountIn);

        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(usdc)),
            buyToken: IERC20(address(weth)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(ZeroXSwapperMockTarget.transferTokens.selector, address(weth), amountIn)
        });
        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData =
            SLeverageSwapData({minAmountOut: 0, toftInfo: toftInfo, swapperData: abi.encode(zeroXSwapData)});
        SGlpLeverageSwapData memory sglLeverageSwapData =
            SGlpLeverageSwapData({token: address(glp), minAmountOut: amountIn, swapData: swapData});

        executor.getCollateral(
            address(this), address(usdc), address(collateral), amountIn, abi.encode(sglLeverageSwapData)
        );

        assertEq(collateral.balanceOf(address(this)), amountIn);
    }

    function test_get_asset_glp() public {
        uint256 balanceBefore = glp.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 1 ether;

        deal(address(usdc), address(swapperTarget), amountIn);
        deal(address(weth), address(gmxMock), amountIn);
        deal(address(glp), address(collateral), amountIn);
        deal(address(collateral), address(executor), amountIn);

        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(weth)),
            buyToken: IERC20(address(usdc)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(ZeroXSwapperMockTarget.transferTokens.selector, address(usdc), amountIn)
        });
        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData =
            SLeverageSwapData({minAmountOut: 0, toftInfo: toftInfo, swapperData: abi.encode(zeroXSwapData)});
        SGlpLeverageSwapData memory sglLeverageSwapData =
            SGlpLeverageSwapData({token: address(weth), minAmountOut: amountIn, swapData: swapData});

        executor.getAsset(address(this), address(collateral), address(usdc), amountIn, abi.encode(sglLeverageSwapData));

        assertEq(usdc.balanceOf(address(this)), amountIn);
    }

    function test_swapper_dust() public {
        address rndAddr = makeAddr("rndAddress");

        uint256 balanceBefore = glp.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 1 ether;
        uint256 minAmountIn = 0.9 ether;

        deal(address(usdc), address(executor), amountIn);
        deal(address(usdc), address(swapperTarget), amountIn);
        deal(address(weth), address(swapperTarget), amountIn);
        deal(address(glp), address(executor), amountIn);

        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(usdc)),
            buyToken: IERC20(address(weth)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                ZeroXSwapperMockTarget.transferTokensWithDust.selector, address(usdc), address(weth), amountIn, minAmountIn
                )
        });
        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData =
            SLeverageSwapData({minAmountOut: 0, toftInfo: toftInfo, swapperData: abi.encode(zeroXSwapData)});
        SGlpLeverageSwapData memory sglLeverageSwapData =
            SGlpLeverageSwapData({token: address(glp), minAmountOut: minAmountIn, swapData: swapData});

        executor.getCollateral(rndAddr, address(usdc), address(collateral), amountIn, abi.encode(sglLeverageSwapData));

        assertEq(collateral.balanceOf(address(this)), minAmountIn);
        assertEq(usdc.balanceOf(rndAddr), amountIn - minAmountIn);
    }
}
