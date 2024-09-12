// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {AssetTotsDaiLeverageExecutor} from "contracts/markets/leverage/AssetTotsDaiLeverageExecutor.sol";
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

import {IZeroXSwapper} from "tap-utils/interfaces/periph/IZeroXSwapper.sol";
import {BaseLeverageExecutorTest} from "./BaseLeverageExecutorTest.t.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {ZeroXSwapper} from "tap-utils/Swapper/ZeroXSwapper.sol";
import {TOFTMock} from "../mocks/TOFTMock.sol";
import {Pearlmit, IPearlmit} from "tap-utils/pearlmit/Pearlmit.sol";

import "forge-std/Test.sol";

contract AssetToSDaiLeverageExecutorTest is BaseLeverageExecutorTest {
    SavingsDaiMock sDai;
    ERC20Mock dai;
    ERC20Mock asset;
    TOFTMock toft;
    AssetTotsDaiLeverageExecutor executor;
    YieldBox yieldBox;
    Cluster cluster;
    Pearlmit pearlmit;

    uint256 toftYieldBoxId;
    uint256 assetYieldBoxId;

    ZeroXSwapperMockTarget swapperTarget;
    ZeroXSwapper swapper;

    function setUp() public {
        pearlmit = new Pearlmit("Test", "1", address(this), 0);
        {
            dai = new ERC20Mock("DAI", "DAI");
            vm.label(address(dai), "dai");

            asset = new ERC20Mock("Asset", "asset");
            vm.label(address(asset), "asset");

            sDai = new SavingsDaiMock(address(dai));
            vm.label(address(sDai), "sDai");

            toft = new TOFTMock(address(sDai), IPearlmit(address(pearlmit)));
            vm.label(address(toft), "toft");
        }
        {
            YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();
            yieldBox = new YieldBox(IWrappedNative(address(0)), uriBuilder, pearlmit, address(this));

            ERC20WithoutStrategy assetStrategy = createEmptyStrategy(address(yieldBox), address(asset));
            assetYieldBoxId =
                yieldBox.registerAsset(TokenType.ERC20, address(asset), IStrategy(address(assetStrategy)), 0);

            ERC20WithoutStrategy toftStrategy = createEmptyStrategy(address(yieldBox), address(toft));
            toftYieldBoxId = yieldBox.registerAsset(TokenType.ERC20, address(toft), IStrategy(address(toftStrategy)), 0);
        }

        {
            cluster = new Cluster(0, address(this));

            swapperTarget = new ZeroXSwapperMockTarget();
            swapper = new ZeroXSwapper(address(swapperTarget), ICluster(address(cluster)), address(this));

            executor = new AssetTotsDaiLeverageExecutor(
                IZeroXSwapper(address(swapper)), ICluster(address(cluster)), address(0), IPearlmit(address(pearlmit))
            );
        }

        {
            cluster.setRoleForContract(address(executor),  keccak256("SWAP_EXECUTOR"), true);
            cluster.setRoleForContract(address(this),  keccak256("tsDai_MARKET_LEVERAGE_CALLER"), true);

            cluster.updateContract(0, address(this), true);
            cluster.updateContract(0, address(executor), true);
            cluster.updateContract(0, address(swapper), true);
            cluster.updateContract(0, address(swapperTarget), true);
            cluster.updateContract(0, address(yieldBox), true);
            cluster.updateContract(0, address(asset), true);
            cluster.updateContract(0, address(toft), true);
            vm.label(address(cluster), "cluster");
            vm.label(address(executor), "executor");
            vm.label(address(swapper), "swapper");
            vm.label(address(swapperTarget), "swapperTarget");
            vm.label(address(yieldBox), "yieldBox");
        }
    }

    function test_get_collateral_sdai() public {
        uint256 balanceBefore = toft.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 1 ether;

        deal(address(dai), address(swapperTarget), amountIn);
        deal(address(asset), address(executor), amountIn);

        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(asset)),
            buyToken: IERC20(address(dai)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(ZeroXSwapperMockTarget.transferTokens.selector, address(dai), amountIn)
        });

        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData =
            SLeverageSwapData({minAmountOut: 0, toftInfo: toftInfo, swapperData: abi.encode(zeroXSwapData)});

        executor.getCollateral(address(this), address(asset), address(toft), amountIn, abi.encode(swapData));

        assertEq(toft.balanceOf(address(this)), amountIn);
    }

    function test_get_asset() public {
        uint256 balanceBefore = toft.balanceOf(address(this));
        assertEq(balanceBefore, 0);

        uint256 amountIn = 1 ether;

        deal(address(toft), address(executor), amountIn);
        deal(address(sDai), address(toft), amountIn);
        deal(address(dai), address(sDai), amountIn);
        deal(address(asset), address(swapperTarget), amountIn);

        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(dai)),
            buyToken: IERC20(address(asset)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(ZeroXSwapperMockTarget.transferTokens.selector, address(asset), amountIn)
        });

        SToftInfo memory toftInfo = SToftInfo({isTokenInToft: false, isTokenOutToft: false});
        SLeverageSwapData memory swapData =
            SLeverageSwapData({minAmountOut: 0, toftInfo: toftInfo, swapperData: abi.encode(zeroXSwapData)});

        executor.getAsset(address(this), address(toft), address(asset), amountIn, abi.encode(swapData));
        assertEq(asset.balanceOf(address(this)), amountIn);
    }
}
