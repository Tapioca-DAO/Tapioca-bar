// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";
import {SGLLiquidation} from "contracts/markets/singularity/SGLLiquidation.sol";
import {SGLCollateral} from "contracts/markets/singularity/SGLCollateral.sol";
import {SGLLeverage} from "contracts/markets/singularity/SGLLeverage.sol";
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {SGLBorrow} from "contracts/markets/singularity/SGLBorrow.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {Market} from "contracts/markets/Market.sol";

import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {MagnetarHelper} from "tapioca-periph/Magnetar/MagnetarHelper.sol";

// import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {IMarket, Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {ITwTap} from "tapioca-periph/interfaces/tap-token/ITwTap.sol";
import {IOracle} from "tapioca-periph/oracle/interfaces/IOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";

import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";

import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";
import {Penrose} from "contracts/Penrose.sol";

import {MarketLiquidatorReceiverMock} from "../mocks/MarketLiquidatorReceiverMock.sol";
import {MagnetarMock} from "../mocks/MagnetarMock.sol";
import {SwapperMock} from "../mocks/SwapperMock.sol";
import {OracleMock} from "../mocks/OracleMock.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {TwTapMock} from "../mocks/TwTapMock.sol";
import {UsdoMock} from "../mocks/UsdoMock.sol";
import {TOFTMock} from "../mocks/TOFTMock.sol";

import {UsdoHelper} from "contracts/usdo/extensions/UsdoHelper.sol";
import {UsdoSender} from "contracts/usdo/modules/UsdoSender.sol";

import {UsdoTestHelper, TestPenroseData, TestSingularityData} from "../helpers/UsdoTestHelper.t.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

import "forge-std/Test.sol";

contract SingularityTest is UsdoTestHelper {
    uint32 aEid = 1;
    uint32 bEid = 2;

    Pearlmit pearlmit;
    Cluster cluster;
    YieldBox yieldBox;
    ERC20Mock tapOFT;
    ERC20Mock weth;

    ERC20Mock assetErc20;
    ERC20Mock collateralErc20;
    TOFTMock asset;
    TOFTMock collateral;

    MagnetarMock magnetar;

    UsdoHelper usdoHelper;

    SwapperMock swapper;
    Penrose penrose;
    SimpleLeverageExecutor leverageExecutor;
    Singularity masterContract;
    Singularity singularity;
    MarketHelper marketHelper;
    OracleMock oracle;
    MarketLiquidatorReceiverMock liquidatorMock;
    MagnetarHelper magnetarHelper;

    uint256 assetYieldBoxId;
    uint256 collateralYieldBoxId;

    uint256 internal userAPKey = 0x1;
    uint256 internal userBPKey = 0x2;
    address public userA = vm.addr(userAPKey);
    address public userB = vm.addr(userBPKey);
    uint256 public initialBalance = 100 ether;

    function setUp() public override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);
        vm.label(userA, "userA");
        vm.label(userB, "userB");

        {
            tapOFT = new ERC20Mock("Tapioca OFT", "TAP");
            vm.label(address(tapOFT), "tapOFT");

            weth = new ERC20Mock("Wrapped Ethereum", "WETH");
            vm.label(address(weth), "WETH");

            assetErc20 = new ERC20Mock("AERC", "AERC");
            vm.label(address(assetErc20), "assetErc20");

            collateralErc20 = new ERC20Mock("CERC", "CERC");
            vm.label(address(collateralErc20), "collateralErc20");

            asset = new TOFTMock(address(assetErc20));
            vm.label(address(asset), "asset");

            collateral = new TOFTMock(address(collateralErc20));
            vm.label(address(collateral), "collateral");
        }

        marketHelper = new MarketHelper();
        magnetarHelper = new MagnetarHelper();

        setUpEndpoints(3, LibraryType.UltraLightNode);

        {
            pearlmit = new Pearlmit("Pearlmit", "1");
            yieldBox = createYieldBox();
            cluster = createCluster(aEid, address(this));
            magnetar = createMagnetar(address(cluster), IPearlmit(address(pearlmit)));

            vm.label(address(endpoints[aEid]), "aEndpoint");
            vm.label(address(endpoints[bEid]), "bEndpoint");
            vm.label(address(yieldBox), "YieldBox");
            vm.label(address(cluster), "Cluster");
            vm.label(address(magnetar), "Magnetar");
            vm.label(address(pearlmit), "Pearlmit");
        }

        {
            ERC20WithoutStrategy assetStrategy = createYieldBoxEmptyStrategy(address(yieldBox), address(asset));
            ERC20WithoutStrategy collateralStrategy =
                createYieldBoxEmptyStrategy(address(yieldBox), address(collateral));

            assetYieldBoxId = registerYieldBoxAsset(address(yieldBox), address(asset), address(assetStrategy));
            collateralYieldBoxId =
                registerYieldBoxAsset(address(yieldBox), address(collateral), address(collateralStrategy));
        }

        swapper = createSwapper(yieldBox);
        leverageExecutor = createLeverageExecutor(address(yieldBox), address(swapper), address(cluster));
        (penrose, masterContract) = createPenrose(
            TestPenroseData(
                address(yieldBox),
                address(cluster),
                address(tapOFT),
                address(weth),
                IPearlmit(address(pearlmit)),
                address(this)
            )
        );
        oracle = createOracle();
        singularity = createSingularity(
            penrose,
            TestSingularityData(
                address(penrose),
                IERC20(address(asset)), //asset
                assetYieldBoxId,
                IERC20(address(collateral)), //collateral
                collateralYieldBoxId,
                IOracle(address(oracle)),
                ILeverageExecutor(address(leverageExecutor))
            ),
            address(masterContract)
        );
        vm.label(address(singularity), "Singularity");
    }

    function depositAsset(uint256 amount) public {
        deal(address(asset), address(this), amount);
        asset.approve(address(yieldBox), type(uint256).max);
        asset.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(address(singularity), true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(
            address(yieldBox), assetYieldBoxId, address(singularity), type(uint200).max, uint48(block.timestamp)
        );

        uint256 share = yieldBox.toShare(assetYieldBoxId, amount, false);
        yieldBox.depositAsset(assetYieldBoxId, address(this), address(this), 0, share);
        singularity.addAsset(address(this), address(this), false, share);
    }

    function depositCollateral(uint256 amount) public {
        deal(address(collateral), address(this), amount);
        collateral.approve(address(yieldBox), type(uint256).max);
        collateral.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(address(singularity), true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(
            address(yieldBox), collateralYieldBoxId, address(singularity), type(uint200).max, uint48(block.timestamp)
        );

        uint256 share = yieldBox.toShare(collateralYieldBoxId, amount, false);
        yieldBox.depositAsset(collateralYieldBoxId, address(this), address(this), 0, share);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.addCollateral(address(this), address(this), false, 0, share);
        singularity.execute(modules, calls, true);
    }

    function borrow(uint256 amount, bool expectRevert) public {
        (Module[] memory modules, bytes[] memory calls) = marketHelper.borrow(address(this), address(this), amount);

        if (expectRevert) vm.expectRevert();
        singularity.execute(modules, calls, true);
    }

    function repay(uint256 part) public {
        pearlmit.approve(
            address(yieldBox), assetYieldBoxId, address(singularity), type(uint200).max, uint48(block.timestamp)
        );
        (Module[] memory modules, bytes[] memory calls) = marketHelper.repay(address(this), address(this), false, part);
        singularity.execute(modules, calls, true);
    }

    function test_setSingularityConfig() public {
        uint256 borrowingOpeningFee = singularity.borrowOpeningFee();
        uint256 liquidationMultiplier = singularity.liquidationMultiplier();
        uint256 minimumTargetUtilization = singularity.minimumTargetUtilization();
        uint256 maximumTargetUtilization = singularity.maximumTargetUtilization();
        uint256 minimumInterestPerSecond = singularity.minimumInterestPerSecond();
        uint256 maximumInterestPerSecond = singularity.maximumInterestPerSecond();
        uint256 interestElasticity = singularity.interestElasticity();

        bytes memory payload = abi.encodeWithSelector(
            Singularity.setSingularityConfig.selector, singularity.borrowOpeningFee(), 0, 0, 0, 0, 0, 0
        );
        address[] memory mc = new address[](1);
        mc[0] = address(singularity);

        bytes[] memory data = new bytes[](1);
        data[0] = payload;
        penrose.executeMarketFn(mc, data, false);

        {
            assertEq(singularity.borrowOpeningFee(), borrowingOpeningFee);
            assertEq(singularity.liquidationMultiplier(), liquidationMultiplier);
            assertEq(singularity.minimumTargetUtilization(), minimumTargetUtilization);
            assertEq(singularity.maximumTargetUtilization(), maximumTargetUtilization);
            assertEq(singularity.minimumInterestPerSecond(), minimumInterestPerSecond);
            assertEq(singularity.maximumInterestPerSecond(), maximumInterestPerSecond);
            assertEq(singularity.interestElasticity(), interestElasticity);
        }

        uint256 toSetValue = 101;
        {
            payload = abi.encodeWithSelector(Singularity.setSingularityConfig.selector, toSetValue, 0, 0, 0, 0, 0, 0);
            data = new bytes[](1);
            data[0] = payload;
            penrose.executeMarketFn(mc, data, false);
        }
        assertEq(singularity.borrowOpeningFee(), toSetValue);
    }

    function test_setMarketConfig() public {
        address toSetAddress = address(userA);
        uint256 toSetValue = 101;
        uint256 toSetMaxValue = 102;
        {
            bytes memory payload = abi.encodeWithSelector(
                Market.setMarketConfig.selector,
                toSetAddress,
                "",
                toSetAddress,
                toSetValue,
                toSetValue,
                toSetValue,
                toSetMaxValue,
                toSetValue,
                toSetValue,
                toSetMaxValue
            );
            address[] memory mc = new address[](1);
            mc[0] = address(singularity);

            bytes[] memory data = new bytes[](1);
            data[0] = payload;
            penrose.executeMarketFn(mc, data, false);
        }

        {
            assertEq(address(singularity.oracle()), address(toSetAddress));
            assertEq(singularity.conservator(), toSetAddress);
            assertEq(singularity.protocolFee(), toSetValue);
            assertEq(singularity.minLiquidatorReward(), toSetValue);
            assertEq(singularity.maxLiquidatorReward(), toSetMaxValue);
            assertEq(singularity.totalBorrowCap(), toSetValue);
            assertEq(singularity.collateralizationRate(), toSetValue);
            assertEq(singularity.liquidationCollateralizationRate(), toSetMaxValue);
        }
    }

    function test_initialize_twice() public {
        vm.expectRevert();
        singularity.init("");
        singularity.accrue();
    }

    function test_remove_everything() public {
        uint256 tokenAmount_ = 1 ether;
        depositAsset(tokenAmount_);
        assertGt(singularity.balanceOf(address(this)), 0);

        uint256 share = yieldBox.toShare(assetYieldBoxId, tokenAmount_, false);
        vm.expectRevert();
        singularity.removeAsset(address(this), address(this), share);
    }

    function test_should_not_work_when_paused() public {
        {
            bytes memory payload = abi.encodeWithSelector(
                Market.setMarketConfig.selector,
                address(0),
                "",
                address(this), //conservator
                0,
                0,
                0,
                0,
                0,
                0,
                0
            );
            address[] memory mc = new address[](1);
            mc[0] = address(singularity);

            bytes[] memory data = new bytes[](1);
            data[0] = payload;
            penrose.executeMarketFn(mc, data, false);
        }

        //add collateral
        singularity.updatePause(Market.PauseType.AddCollateral, true, false);

        Module[] memory modules;
        bytes[] memory calls;
        (modules, calls) = marketHelper.addCollateral(address(this), address(this), false, 1, 0);
        vm.expectRevert("Market: paused");
        singularity.execute(modules, calls, true);

        //add collateral
        singularity.updatePause(Market.PauseType.RemoveCollateral, true, false);
        (modules, calls) = marketHelper.removeCollateral(address(this), address(this), 1);
        vm.expectRevert("Market: paused");
        singularity.execute(modules, calls, true);

        singularity.updatePause(Market.PauseType.Borrow, true, false);
        (modules, calls) = marketHelper.borrow(address(this), address(this), 1);
        vm.expectRevert("Market: paused");
        singularity.execute(modules, calls, true);
    }

    function test_should_not_borrow_without_lenders() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        deal(address(collateral), address(this), collateralAmount);

        depositCollateral(collateralAmount);

        borrow(borrowAmount, true);
    }

    function test_borrow_and_liquidate() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        {
            deal(address(collateral), address(this), collateralAmount);
            deal(address(asset), address(this), borrowAmount * 2);
        }

        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            borrow(borrowAmount, false);
        }

        uint256 oracleRate = oracle.rate();
        oracle.set(oracleRate * 2);

        liquidatorMock = new MarketLiquidatorReceiverMock(IERC20(address(asset)));
        deal(address(asset), address(liquidatorMock), borrowAmount * 2);

        address[] memory users = new address[](1);
        users[0] = address(this);

        uint256[] memory borrowParts = new uint256[](1);
        borrowParts[0] = borrowAmount / 2;

        uint256[] memory minLiquidationBonuses = new uint256[](1);
        minLiquidationBonuses[0] = 1e4;

        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
        receivers[0] = IMarketLiquidatorReceiver(address(liquidatorMock));

        bytes[] memory receiverData = new bytes[](1);
        receiverData[0] = abi.encode(borrowAmount / 2);

        uint256 borrowPartBefore = singularity.userBorrowPart(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
        singularity.execute(modules, calls, true);
        uint256 borrowPartAfter = singularity.userBorrowPart(address(this));

        assertGt(borrowPartBefore, borrowPartAfter);
    }

    function test_borrow_and_liquidate_bad_debt() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        {
            deal(address(collateral), address(this), collateralAmount);
            deal(address(asset), address(this), borrowAmount * 2);
        }

        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            borrow(borrowAmount, false);
        }

        uint256 oracleRate = oracle.rate();
        oracle.set(oracleRate * 100);

        liquidatorMock = new MarketLiquidatorReceiverMock(IERC20(address(asset)));
        // deal(address(asset), address(liquidatorMock), borrowAmount * 2);

        //cannot liquidate
        {
            address[] memory users = new address[](1);
            users[0] = address(this);

            uint256[] memory borrowParts = new uint256[](1);
            borrowParts[0] = borrowAmount / 2;

            uint256[] memory minLiquidationBonuses = new uint256[](1);
            minLiquidationBonuses[0] = 1e4;

            IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
            receivers[0] = IMarketLiquidatorReceiver(address(liquidatorMock));

            bytes[] memory receiverData = new bytes[](1);
            receiverData[0] = abi.encode(borrowAmount / 2);

            uint256 borrowPartBefore = singularity.userBorrowPart(address(this));
            (Module[] memory modules, bytes[] memory calls) =
                marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
            vm.expectRevert();
            singularity.execute(modules, calls, true);
            uint256 borrowPartAfter = singularity.userBorrowPart(address(this));
            assertEq(borrowPartBefore, borrowPartAfter);
        }

        //use liquidateBadDebt
        {
            uint256 borrowPartBefore = singularity.userBorrowPart(address(this));
            (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(
                address(this),
                address(this),
                address(this),
                IMarketLiquidatorReceiver(address(liquidatorMock)),
                "",
                false
            );

            cluster.updateContract(0, address(this), true);
            deal(address(asset), address(this), borrowAmount * 2);
            asset.approve(address(singularity), type(uint256).max);
            bytes memory badDebtCall = abi.encodeWithSelector(Singularity.execute.selector, modules, calls, true);

            address[] memory mc = new address[](1);
            mc[0] = address(singularity);

            bytes[] memory data = new bytes[](1);
            data[0] = badDebtCall;
            penrose.executeMarketFn(mc, data, false);
            uint256 borrowPartAfter = singularity.userBorrowPart(address(this));
            assertGt(borrowPartBefore, borrowPartAfter);
        }
    }

    function test_magnetar_helper_info() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        {
            deal(address(collateral), address(this), collateralAmount);
            deal(address(asset), address(this), borrowAmount * 2);
        }

        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            borrow(borrowAmount, false);
        }

        ISingularity[] memory markets = new ISingularity[](1);
        markets[0] = ISingularity(address(singularity));
        MagnetarHelper.SingularityInfo[] memory info = magnetarHelper.singularityMarketInfo(address(this), markets);

        assertEq(info[0].market.collateral, address(collateral));
        assertEq(info[0].market.asset, address(asset));
        assertEq(info[0].market.userCollateralShare, singularity.userCollateralShare(address(this)));
        assertEq(info[0].market.userBorrowPart, singularity.userBorrowPart(address(this)));

        uint256 share = marketHelper.computeAllowedLendShare(address(singularity), 1, assetYieldBoxId);
        assertGe(share, 1);

        uint256 borrowAmountFromHelper = magnetarHelper.getAmountForBorrowPart(
            IMarket(address(singularity)), singularity.userBorrowPart(address(this))
        );
        assertGe(borrowAmountFromHelper, borrowAmount);
    }

    function test_fees() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        {
            deal(address(collateral), address(this), collateralAmount);
            deal(address(asset), address(this), borrowAmount * 2);
        }

        uint256 userBorrowPart;
        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            borrow(borrowAmount, false);

            vm.roll(10000);
            skip(86400 * 10);
            // prepare for repay
            deal(address(asset), address(this), borrowAmount * 2);
            yieldBox.depositAsset(assetYieldBoxId, address(this), address(this), borrowAmount * 2, 0);
            userBorrowPart = singularity.userBorrowPart(address(this));

            repay(singularity.userBorrowPart(address(this)));
        }
        (,, uint128 feesEarnedFraction) = singularity.accrueInfo();
        uint256 feesAmount =
            magnetarHelper.getAmountForAssetFraction(ISingularity(address(singularity)), feesEarnedFraction);
        assertGe(userBorrowPart, borrowAmount);
        assertGe(feesEarnedFraction, 0);
        assertGe(feesAmount, 0);

        IMarket[] memory markets = new IMarket[](1);
        markets[0] = IMarket(address(singularity));

        TwTapMock twTapMock = new TwTapMock(address(asset));

        uint256 twTapBalanceBefore = asset.balanceOf(address(twTapMock));
        penrose.withdrawAllMarketFees(markets, ITwTap(address(twTapMock)));
        uint256 twTapBalanceAfter = asset.balanceOf(address(twTapMock));
        assertGe(twTapBalanceAfter, twTapBalanceBefore);
        assertGe(twTapBalanceAfter, feesAmount);
    }

    function test_borrow_repay_different_users() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        {
            deal(address(collateral), address(this), collateralAmount);
            deal(address(asset), address(this), borrowAmount * 2);
        }

        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            borrow(borrowAmount, false);
        }

        uint256 borrowPart = singularity.userBorrowPart(address(this));
        assertGt(borrowPart, 0);

        vm.startPrank(userA);
        asset.approve(address(yieldBox), type(uint256).max);
        asset.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(address(singularity), true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(
            address(yieldBox), assetYieldBoxId, address(singularity), type(uint200).max, uint48(block.timestamp)
        );

        vm.stopPrank();

        singularity.approveBorrow(address(userA), type(uint256).max);
        singularity.approve(address(userA), type(uint256).max);

        deal(address(asset), address(userA), borrowAmount * 2);

        uint256 share = yieldBox.toShare(assetYieldBoxId, borrowAmount * 2, false);
        vm.prank(userA);
        yieldBox.depositAsset(assetYieldBoxId, address(userA), address(userA), 0, share);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.repay(address(userA), address(this), false, borrowPart);
        vm.prank(userA);
        singularity.execute(modules, calls, true);

        uint256 borrowPartAfter = singularity.userBorrowPart(address(this));
        assertEq(borrowPartAfter, 0);
    }

    //TODO: complete after audit fixes
    // function test_buyCollateral() public {
    //     uint256 collateralAmount = 1 ether;
    //     uint256 borrowAmount = 4e17;
    //     uint256 leverageAmount = 2e17;
    //     Module[] memory modules;
    //     bytes[] memory calls;

    //     {
    //         deal(address(collateral), address(this), collateralAmount);
    //         deal(address(asset), address(this), borrowAmount * 2);
    //     }

    //     {
    //         depositAsset(borrowAmount * 2);

    //         depositCollateral(collateralAmount);

    //         borrow(borrowAmount, false);
    //     }

    //     uint256 borrowPartBefore = singularity.userBorrowPart(address(this));
    //     assertGe(borrowPartBefore, borrowAmount);

    //     bytes memory leverageData = abi.encode(1000, "");
    //     (modules, calls) = marketHelper.buyCollateral(address(this), leverageAmount, 0, leverageData);
    //     singularity.execute(modules, calls, true);

    //     uint256 share = 0;
    //     (modules, calls) = marketHelper.sellCollateral(address(this), share, leverageData);
    //     singularity.execute(modules, calls, true);
    // }
}
