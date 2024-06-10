// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {AssetTotsDaiLeverageExecutor} from "contracts/markets/leverage/AssetTotsDaiLeverageExecutor.sol";
import {SToftInfo, SLeverageSwapData} from "contracts/markets/leverage/BaseLeverageExecutor.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";
import {Cluster, ICluster} from "tapioca-periph/Cluster/Cluster.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {ISavingsDai} from "tapioca-periph/interfaces/external/makerdao/ISavingsDai.sol";
import {BaseLeverageExecutorTest} from "../BaseLeverageExecutorTest.t.sol";
import {ZeroXSwapper, IZeroXSwapper} from "tapioca-periph/Swapper/ZeroXSwapper.sol";
import {TOFTMock} from "../../mocks/TOFTMock.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {IUniswapV2Router02, IUniswapV2Router01} from "mocks/uniswapv2/interfaces/IUniswapV2Router02.sol";

import "forge-std/Test.sol";
import "forge-std/console.sol";

contract AssetToSDaiLeverageExecutorForkTest is BaseLeverageExecutorTest {
    IERC20 sDai;
    IERC20 dai;
    ERC20 asset;
    TOFTMock toft;
    AssetTotsDaiLeverageExecutor executor;
    YieldBox yieldBox;
    Cluster cluster;
    Pearlmit pearlmit;

    uint256 toftYieldBoxId;
    uint256 assetYieldBoxId;

    address swapperTarget;
    ZeroXSwapper swapper;

    IUniswapV2Router02 router;

    function setUp() public {
        vm.createSelectFork(vm.envString("MAINNET_RPC_URL"), 20049700);
        pearlmit = new Pearlmit("Pearlmit", "1", address(this), 0);

        // Set token addresses
        {
            dai = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
            vm.label(address(dai), "dai");

            sDai = IERC20(0x83F20F44975D03b1b09e64809B757c47f942BEeA);
            vm.label(address(sDai), "sDai");

            asset = new ERC20("USDO", "USDO");
            vm.label(address(asset), "asset");

            toft = new TOFTMock(address(sDai), IPearlmit(address(pearlmit)));
            vm.label(address(toft), "toft");
        }

        // Register tokens to yieldbox
        {
            YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();
            yieldBox = new YieldBox(IWrappedNative(address(0)), uriBuilder);

            ERC20WithoutStrategy assetStrategy = createEmptyStrategy(address(yieldBox), address(asset));
            assetYieldBoxId =
                yieldBox.registerAsset(TokenType.ERC20, address(asset), IStrategy(address(assetStrategy)), 0);

            ERC20WithoutStrategy toftStrategy = createEmptyStrategy(address(yieldBox), address(toft));
            toftYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(toft), IStrategy(address(toftStrategy)), 0);
        }

        // Setup swappers
        {
            cluster = new Cluster(0, address(this));

            router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
            swapperTarget = _setupUniV2Pool(address(dai), address(asset), 1e7 ether, 1e7 ether);
            swapper = new ZeroXSwapper(swapperTarget, ICluster(address(cluster)), address(this));

            executor = new AssetTotsDaiLeverageExecutor(
                IZeroXSwapper(address(swapper)), ICluster(address(cluster)), address(0), IPearlmit(address(pearlmit))
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
            vm.label(address(cluster), "cluster");
            vm.label(address(executor), "executor");
            vm.label(address(swapper), "swapper");
            vm.label(swapperTarget, "swapperTarget");
            vm.label(address(yieldBox), "yieldBox");
        }
    }

    function testZeroXSwap() public {
        // test DAI->USDO swap via zeroxswapper
        address alice = address(1001);
        uint256 amountToSwap = 1000 ether;
        cluster.updateContract(0, alice, true);
        deal(address(dai), alice, amountToSwap);

        vm.startPrank(alice);
        dai.approve(address(swapper), amountToSwap);
        (IZeroXSwapper.SZeroXSwapData memory zeroXSwapData, uint256 amountOut) =
            _getZeroXSwapperPayloadUniV2(address(dai), address(asset), alice, amountToSwap, 0);
        swapper.swap(zeroXSwapData, amountToSwap, 0);

        assertEq(dai.balanceOf(alice), 0);
        assertEq(asset.balanceOf(alice), amountOut);

        // test USDO->DAI swap via zeroxswapper
        amountToSwap = asset.balanceOf(alice);
        asset.approve(address(swapper), amountToSwap);
        (zeroXSwapData, amountOut) = _getZeroXSwapperPayloadUniV2(address(asset), address(dai), alice, amountToSwap, 0);
        swapper.swap(zeroXSwapData, amountToSwap, 0);

        assertEq(asset.balanceOf(alice), 0);
        assertEq(dai.balanceOf(alice), amountOut);

        vm.stopPrank();
        cluster.updateContract(0, alice, false);
    }

    function test_get_collateral_forking() public {
        uint256 balanceBefore = toft.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 100 ether;
        deal(address(asset), address(executor), amountIn);

        (IZeroXSwapper.SZeroXSwapData memory zeroXSwapData, uint256 expectedDAIOut) =
            _getZeroXSwapperPayloadUniV2(address(asset), address(dai), address(swapper), amountIn, 0);

        uint256 expectedsDai = ISavingsDai(address(sDai)).convertToShares(expectedDAIOut);
        uint256 expectedTOFT = _getExpectedTOFTConversionOutput(expectedsDai, 0);

        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData =
            SLeverageSwapData({minAmountOut: expectedsDai, toftInfo: toftInfo, swapperData: abi.encode(zeroXSwapData)});

        executor.getCollateral(address(this), address(asset), address(toft), amountIn, abi.encode(swapData));

        assertEq(sDai.balanceOf(address(executor)), 0);
        assertEq(dai.balanceOf(address(executor)), 0);
        assertEq(asset.balanceOf(address(executor)), 0);
        assertEq(toft.balanceOf(address(this)), expectedTOFT);
    }

    function test_get_asset_forking() public {
        _fundTOFTInitial();

        // Call executor
        uint256 balanceBefore = toft.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 100 ether;
        deal(address(toft), address(executor), amountIn);

        uint256 expectedSDai = _getExpectedTOFTConversionOutput(amountIn, 1);
        uint256 expectedDai = ISavingsDai(address(sDai)).convertToAssets(expectedSDai);

        (IZeroXSwapper.SZeroXSwapData memory zeroXSwapData, uint256 expectedAssetOut) =
            _getZeroXSwapperPayloadUniV2(address(dai), address(asset), address(swapper), expectedDai, 0);

        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData = SLeverageSwapData({
            minAmountOut: expectedAssetOut,
            toftInfo: toftInfo,
            swapperData: abi.encode(zeroXSwapData)
        });

        executor.getAsset(address(this), address(toft), address(asset), amountIn, abi.encode(swapData));

        // assert end state
        assertEq(toft.balanceOf(address(executor)), 0);
        assertEq(sDai.balanceOf(address(executor)), 0);
        assertEq(dai.balanceOf(address(executor)), 0);
        assertEq(asset.balanceOf(address(address(this))), expectedAssetOut);
    }

    // Simulates the output for wrap/unwrap TOFT operations
    // Useful when using the actual TOFT contracts, which adds fees
    function _getExpectedTOFTConversionOutput(uint256 amount, uint256 operation) internal returns (uint256 expected) {
        // operation 0 => wrap
        // operation 1 => unwrap
        address funder = address(1001);
        uint256 snapshot = vm.snapshot();

        vm.startPrank(funder);
        if (operation == 0) {
            deal(toft.erc20_(), funder, amount);
            _givePearlmitApprovalERC20(toft.erc20_(), address(toft), amount);
            expected = toft.wrap(funder, funder, amount);
        } else if (operation == 1) {
            deal(address(toft), funder, amount);
            expected = toft.unwrap(funder, amount);
        }
        vm.stopPrank();
        vm.revertTo(snapshot);
    }

    // Fund TOFT with token so unwrap works
    function _fundTOFTInitial() internal {
        // fund the toft with an initial wrap
        address funder = address(1001);
        uint256 fundAmount = 1e6 ether;
        deal(address(sDai), funder, fundAmount);

        vm.startPrank(funder);
        _givePearlmitApprovalERC20(address(sDai), address(toft), fundAmount);
        uint256 balanceAfter = toft.wrap(funder, funder, fundAmount);
        assertEq(toft.balanceOf(funder), balanceAfter);
        vm.stopPrank();
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
    ) internal returns (IZeroXSwapper.SZeroXSwapData memory, uint256) {
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
