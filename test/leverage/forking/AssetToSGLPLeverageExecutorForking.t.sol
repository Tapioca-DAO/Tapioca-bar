// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {
    AssetToSGLPLeverageExecutor,
    SGlpLeverageSwapData
} from "contracts/markets/leverage/AssetToSGLPLeverageExecutor.sol";
import {SToftInfo, SLeverageSwapData} from "contracts/markets/leverage/BaseLeverageExecutor.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";
import {Cluster, ICluster} from "tapioca-periph/Cluster/Cluster.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {BaseLeverageExecutorTest} from "../BaseLeverageExecutorTest.t.sol";
import {ZeroXSwapper, IZeroXSwapper} from "tapioca-periph/Swapper/ZeroXSwapper.sol";
import {TOFTMock} from "../../mocks/TOFTMock.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {IUniswapV2Router02, IUniswapV2Router01} from "mocks/uniswapv2/interfaces/IUniswapV2Router02.sol";
import {IGmxRewardRouterV2} from "tapioca-periph/interfaces/external/gmx/IGmxRewardRouterV2.sol";

import "forge-std/Test.sol";
import "forge-std/console.sol";

contract AssetToSGLPLeverageExecutorForkTest is BaseLeverageExecutorTest {
    IERC20 sglp;
    IERC20 weth;
    ERC20 asset;
    TOFTMock toft;
    AssetToSGLPLeverageExecutor executor;
    YieldBox yieldBox;
    Cluster cluster;
    Pearlmit pearlmit;
    IGmxRewardRouterV2 gmxRouter;

    uint256 toftYieldBoxId;
    uint256 assetYieldBoxId;
    uint256 wethYieldBoxId;
    uint256 glpYieldBoxId;

    address swapperTarget;
    ZeroXSwapper swapper;

    IUniswapV2Router02 router;

    function setUp() public {
        vm.createSelectFork(vm.envString("ARBITRUM_RPC_URL"), 220326400);
        pearlmit = new Pearlmit("Pearlmit", "1", address(this), 0);

        // Set token addresses
        {
            weth = IERC20(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
            vm.label(address(weth), "weth");

            sglp = IERC20(0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE);
            vm.label(address(sglp), "sglp");

            asset = new ERC20("USDO", "USDO");
            vm.label(address(asset), "asset");

            toft = new TOFTMock(address(sglp), IPearlmit(address(pearlmit)));
            vm.label(address(toft), "toft");

            gmxRouter = IGmxRewardRouterV2(0xB95DB5B167D75e6d04227CfFFA61069348d271F5);
            vm.label(address(gmxRouter), "GMX_Router");
        }

        // Register tokens to yieldbox
        {
            YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();
            yieldBox = new YieldBox(IWrappedNative(address(0)), uriBuilder);

            ERC20WithoutStrategy assetStrategy = createEmptyStrategy(address(yieldBox), address(asset));
            assetYieldBoxId =
                yieldBox.registerAsset(TokenType.ERC20, address(asset), IStrategy(address(assetStrategy)), 0);

            ERC20WithoutStrategy wethStrategy = createEmptyStrategy(address(yieldBox), address(weth));
            wethYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(weth), IStrategy(address(wethStrategy)), 0);

            ERC20WithoutStrategy glpStrategy = createEmptyStrategy(address(yieldBox), address(sglp));
            glpYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(sglp), IStrategy(address(glpStrategy)), 0);

            ERC20WithoutStrategy toftStrategy = createEmptyStrategy(address(yieldBox), address(toft));
            toftYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(toft), IStrategy(address(toftStrategy)), 0);
        }

        // Setup swappers
        {
            cluster = new Cluster(0, address(this));

            router = IUniswapV2Router02(0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24);
            swapperTarget = _setupUniV2Pool(address(weth), address(asset), 1e7 ether, 1e7 ether);
            swapper = new ZeroXSwapper(swapperTarget, ICluster(address(cluster)), address(this));

            executor = new AssetToSGLPLeverageExecutor(
                IZeroXSwapper(address(swapper)),
                ICluster(address(cluster)),
                IGmxRewardRouterV2(address(gmxRouter)),
                address(weth),
                IPearlmit(address(pearlmit))
            );
        }

        // Register in cluster
        {
            cluster.updateContract(0, address(this), true);
            cluster.updateContract(0, address(executor), true);
            cluster.updateContract(0, address(swapper), true);
            cluster.updateContract(0, swapperTarget, true);
            cluster.updateContract(0, address(yieldBox), true);
            cluster.updateContract(0, address(asset), true);
            cluster.updateContract(0, address(toft), true);
            cluster.updateContract(0, address(sglp), true);
            cluster.updateContract(0, address(weth), true);
            cluster.updateContract(0, address(gmxRouter), true);
            vm.label(address(cluster), "cluster");
            vm.label(address(executor), "executor");
            vm.label(address(swapper), "swapper");
            vm.label(swapperTarget, "swapperTarget");
            vm.label(address(yieldBox), "yieldBox");
        }
    }

    function testZeroXSwap() public {
        // test WETH->USDO swap via zeroxswapper
        address alice = address(1001);
        uint256 amountToSwap = 1000 ether;
        cluster.updateContract(0, alice, true);
        deal(address(weth), alice, amountToSwap);

        vm.startPrank(alice);
        weth.approve(address(swapper), amountToSwap);
        (IZeroXSwapper.SZeroXSwapData memory zeroXSwapData, uint256 amountOut) =
            _getZeroXSwapperPayloadUniV2(address(weth), address(asset), alice, amountToSwap, 0);

        swapper.swap(zeroXSwapData, amountToSwap, 0);

        assertEq(weth.balanceOf(alice), 0);
        assertEq(asset.balanceOf(alice), amountOut);

        // test USDO->WETH swap via zeroxswapper
        amountToSwap = asset.balanceOf(alice);
        asset.approve(address(swapper), amountToSwap);
        (zeroXSwapData, amountOut) = _getZeroXSwapperPayloadUniV2(address(asset), address(weth), alice, amountToSwap, 0);
        swapper.swap(zeroXSwapData, amountToSwap, 0);

        assertEq(asset.balanceOf(alice), 0);
        assertEq(weth.balanceOf(alice), amountOut);

        vm.stopPrank();
        cluster.updateContract(0, alice, false);
    }

    function test_get_collateral_GLP_forking() public {
        uint256 balanceBefore = toft.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 100 ether;
        deal(address(asset), address(executor), amountIn);

        (IZeroXSwapper.SZeroXSwapData memory zeroXSwapData, uint256 expectedWETHOut) =
            _getZeroXSwapperPayloadUniV2(address(asset), address(weth), address(swapper), amountIn, 0);

        uint256 expectedSGLPOut = _getExpectedSGLPOut(address(weth), expectedWETHOut);
        uint256 expectedTOFT = _getExpectedTOFTConversionOutput(expectedSGLPOut, 0);

        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData = SLeverageSwapData({
            minAmountOut: expectedWETHOut,
            toftInfo: toftInfo,
            swapperData: abi.encode(zeroXSwapData)
        });
        SGlpLeverageSwapData memory sglLeverageSwapData =
            SGlpLeverageSwapData({token: address(weth), minAmountOut: expectedSGLPOut, swapData: swapData});

        executor.getCollateral(address(this), address(asset), address(toft), amountIn, abi.encode(sglLeverageSwapData));

        assertEq(sglp.balanceOf(address(executor)), 0);
        assertEq(weth.balanceOf(address(executor)), 0);
        assertEq(asset.balanceOf(address(executor)), 0);
        assertEq(toft.balanceOf(address(this)), expectedTOFT);
    }

    function test_get_asset_GLP_forking() public {
        _fundTOFTInitial();

        // Call executor
        uint256 balanceBefore = toft.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 100 ether;
        deal(address(toft), address(executor), amountIn);

        uint256 expectedSGLP = _getExpectedTOFTConversionOutput(amountIn, 1);
        uint256 expectedWETHOut = _getExpectedWETHOut(expectedSGLP, address(weth));

        (IZeroXSwapper.SZeroXSwapData memory zeroXSwapData, uint256 expectedAssetOut) =
            _getZeroXSwapperPayloadUniV2(address(weth), address(asset), address(swapper), expectedWETHOut, 0);
        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData = SLeverageSwapData({
            minAmountOut: expectedAssetOut,
            toftInfo: toftInfo,
            swapperData: abi.encode(zeroXSwapData)
        });
        SGlpLeverageSwapData memory sglLeverageSwapData =
            SGlpLeverageSwapData({token: address(weth), minAmountOut: expectedWETHOut, swapData: swapData});

        executor.getAsset(address(this), address(toft), address(asset), amountIn, abi.encode(sglLeverageSwapData));

        // // assert end state
        assertEq(toft.balanceOf(address(executor)), 0);
        assertEq(sglp.balanceOf(address(executor)), 0);
        assertEq(weth.balanceOf(address(executor)), 0);
        assertEq(asset.balanceOf(address(address(this))), expectedAssetOut);
    }

    // Simulates the output for wrap/unwrap TOFT operations
    // Useful when using the actual TOFT contracts, which adds fees
    function _getExpectedTOFTConversionOutput(uint256 amount, uint256 operation) internal returns (uint256 expected) {
        // operation 0 => wrap
        // operation 1 => unwrap
        address funder = address(1001);
        uint256 snapshot = vm.snapshot();

        if (operation == 0) {
            // Acquire sglp with WETH to then wrap
            uint256 sglpBal;
            for (uint256 fundAmount = 10 ether; fundAmount < 1e9 ether; fundAmount *= 10) {
                sglpBal += _getSGLPFromWeth(funder, fundAmount);
                if (sglpBal >= amount) break;
            }

            vm.startPrank(funder);
            _givePearlmitApprovalERC20(toft.erc20_(), address(toft), amount);
            expected = toft.wrap(funder, funder, amount);
            vm.stopPrank();
        } else if (operation == 1) {
            vm.startPrank(funder);
            deal(address(toft), funder, amount);
            expected = toft.unwrap(funder, amount);
            vm.stopPrank();
        }
        vm.revertTo(snapshot);
    }

    // Fund TOFT with token so unwrap works
    function _fundTOFTInitial() internal {
        // fund the toft with an initial wrap
        address funder = address(1001);
        uint256 WETHfundAmount = 100 ether;
        uint256 sglpOut = _getSGLPFromWeth(funder, WETHfundAmount);

        vm.startPrank(funder);
        _givePearlmitApprovalERC20(address(sglp), address(toft), sglpOut);
        uint256 balanceAfter = toft.wrap(funder, funder, sglpOut);
        assertEq(toft.balanceOf(funder), balanceAfter);
        vm.stopPrank();
    }

    // Deposits WETH into GMX router to get sGLP tokens
    function _getSGLPFromWeth(address account, uint256 WETHamount) internal returns (uint256 sglpOut) {
        vm.startPrank(account);
        deal(address(weth), account, WETHamount);
        weth.approve(gmxRouter.glpManager(), WETHamount);
        sglpOut = gmxRouter.mintAndStakeGlp(address(weth), WETHamount, 0, 0);
        vm.stopPrank();
    }

    // Estimates amount of WETH tokens gained from redeeming GLP tokens
    function _getExpectedWETHOut(uint256 amountSGLPIn, address tokenOut) internal returns (uint256 expectedTokenOut) {
        // simulate glp liquidity removal with snapshots to calculate expected amount
        uint256 snapshot = vm.snapshot();
        address funder = address(1001);

        deal(address(toft), funder, amountSGLPIn);

        vm.startPrank(funder);
        toft.unwrap(funder, amountSGLPIn);
        sglp.approve(gmxRouter.glpManager(), amountSGLPIn);
        expectedTokenOut = gmxRouter.unstakeAndRedeemGlp(tokenOut, amountSGLPIn, 0, funder);
        vm.revertTo(snapshot);
        vm.stopPrank();
    }

    // Simulates and calculates amount of sGLP tokens gained from adding WETH
    function _getExpectedSGLPOut(address token, uint256 tokenAmount) internal returns (uint256 sglpOut) {
        // simulate glp liquidity addition with snapshots
        uint256 snapshot = vm.snapshot();
        address user = address(1001);
        deal(token, user, tokenAmount);
        vm.startPrank(user);
        IERC20(token).approve(gmxRouter.glpManager(), tokenAmount);
        sglpOut = gmxRouter.mintAndStakeGlp(token, tokenAmount, 0, 0);
        vm.stopPrank();
        vm.revertTo(snapshot);
    }

    function _givePearlmitApprovalERC20(address token, address target, uint256 amount) internal {
        pearlmit.approve(20, token, 0, target, uint200(amount), uint48(block.timestamp));
        IERC20(token).approve(address(pearlmit), 0);
        IERC20(token).approve(address(pearlmit), amount);
    }

    // Creates and adds liquidity to uniV2 pool to enable swapper
    function _setupUniV2Pool(address tokenA, address tokenB, uint256 amountA, uint256 amountB)
        internal
        returns (address)
    {
        address funder = address(1001);
        vm.startPrank(funder);
        deal(tokenA, funder, amountA);
        deal(tokenB, funder, amountB);
        IERC20(tokenA).approve(address(router), amountA);
        IERC20(tokenB).approve(address(router), amountB);
        router.addLiquidity(tokenA, tokenB, amountA, amountB, 0, 0, funder, block.timestamp);
        vm.stopPrank();

        return address(router);
    }

    // Create swap data for zeroX
    function _getZeroXSwapperPayloadUniV2(
        address assetIn,
        address assetOut,
        address receiver,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal view returns (IZeroXSwapper.SZeroXSwapData memory, uint256) {
        address[] memory path = new address[](2);
        path[0] = address(assetIn);
        path[1] = address(assetOut);
        uint256 expectedAmountOut = IUniswapV2Router01(address(router)).getAmountsOut(amountIn, path)[1];
        if (minAmountOut == 0) minAmountOut = expectedAmountOut;
        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(assetIn),
            buyToken: IERC20(assetOut),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                IUniswapV2Router01.swapExactTokensForTokens.selector,
                amountIn,
                minAmountOut,
                path,
                receiver,
                block.timestamp
            )
        });

        return (zeroXSwapData, expectedAmountOut);
    }
}
