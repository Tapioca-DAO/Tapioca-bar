// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";
import {BBLiquidation} from "contracts/markets/bigBang/BBLiquidation.sol";
import {BBCollateral} from "contracts/markets/bigBang/BBCollateral.sol";
import {BBLeverage} from "contracts/markets/bigBang/BBLeverage.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {BBBorrow} from "contracts/markets/bigBang/BBBorrow.sol";
import {BBDebtRateHelper} from "contracts/markets/bigBang/BBDebtRateHelper.sol";
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
import {IBigBang} from "tapioca-periph/interfaces/bar/IBigBang.sol";
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

import {UsdoTestHelper, TestPenroseData, TestSingularityData, TestBigBangData} from "../helpers/UsdoTestHelper.t.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

import "forge-std/Test.sol";

contract BigBangTest is UsdoTestHelper {
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
    BigBang masterContract;
    BigBang bigBang;
    MarketHelper marketHelper;
    OracleMock oracle;
    MarketLiquidatorReceiverMock liquidatorMock;
    MagnetarHelper magnetarHelper;
    TwTapMock twTap;

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

        pearlmit = new Pearlmit("Test", "1", address(this), 0);
        {
            tapOFT = new ERC20Mock("Tapioca OFT", "TAP");
            vm.label(address(tapOFT), "tapOFT");

            weth = new ERC20Mock("Wrapped Ethereum", "WETH");
            vm.label(address(weth), "WETH");

            assetErc20 = new ERC20Mock("AERC", "AERC");
            vm.label(address(assetErc20), "assetErc20");

            collateralErc20 = new ERC20Mock("CERC", "CERC");
            vm.label(address(collateralErc20), "collateralErc20");

            asset = new TOFTMock(address(assetErc20), IPearlmit(address(pearlmit)));
            vm.label(address(asset), "asset");

            collateral = new TOFTMock(address(collateralErc20), IPearlmit(address(pearlmit)));
            vm.label(address(collateral), "collateral");
        }

        marketHelper = new MarketHelper();
        magnetarHelper = new MagnetarHelper();

        setUpEndpoints(3, LibraryType.UltraLightNode);

        {
            pearlmit = new Pearlmit("Pearlmit", "1", address(this), 0);
            yieldBox = createYieldBox(pearlmit, address(this));
            cluster = createCluster(aEid, address(this));
            magnetar = createMagnetar(address(cluster), IPearlmit(address(pearlmit)));
            twTap = new TwTapMock(address(asset));

            vm.label(address(endpoints[aEid]), "aEndpoint");
            vm.label(address(endpoints[bEid]), "bEndpoint");
            vm.label(address(yieldBox), "YieldBox");
            vm.label(address(cluster), "Cluster");
            vm.label(address(magnetar), "Magnetar");
            vm.label(address(pearlmit), "Pearlmit");
            vm.label(address(twTap), "TwTapMock");
        }

        // {
        //     ERC20WithoutStrategy collateralStrategy =
        //         createYieldBoxEmptyStrategy(address(yieldBox), address(collateral));
        //     collateralYieldBoxId =
        //         registerYieldBoxAsset(address(yieldBox), address(collateral), address(collateralStrategy));
        // }

        swapper = createSwapper(yieldBox);
        leverageExecutor =
            createLeverageExecutor(address(yieldBox), address(swapper), address(cluster), address(pearlmit));
        (penrose,) = createPenrose(
            TestPenroseData(
                address(yieldBox),
                address(cluster),
                address(tapOFT),
                address(collateral),
                IPearlmit(address(pearlmit)),
                address(this)
            )
        );

        masterContract = new BigBang();
        penrose.registerBigBangMasterContract(address(masterContract), IPenrose.ContractType.mediumRisk);

        address usdoStrat = address(createYieldBoxEmptyStrategy(address(yieldBox), address(asset)));
        uint256 usdoAssetId = registerYieldBoxAsset(address(yieldBox), address(asset), usdoStrat);
        penrose.setUsdoToken(address(asset), usdoAssetId);

        collateralYieldBoxId = penrose.mainAssetId();

        oracle = createOracle();
        bigBang = createBigBang(
            TestBigBangData(
                address(penrose),
                address(collateral), //collateral
                collateralYieldBoxId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(address(leverageExecutor)),
                0,
                0,
                0
            ),
            address(masterContract)
        );
        vm.label(address(bigBang), "BigBang");

        assetYieldBoxId = bigBang._assetId();

        // set asset oracle
        address[] memory markets = new address[](1);
        markets[0] = address(bigBang);
        bytes[] memory marketsData = new bytes[](1);
        marketsData[0] = abi.encodeWithSelector(BigBang.setAssetOracle.selector, oracle, "0x");

        penrose.executeMarketFn(markets, marketsData, true);
        penrose.setBigBangEthMarket(address(bigBang));

        BBDebtRateHelper bbRateHelper = new BBDebtRateHelper();
        marketsData[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, address(bbRateHelper));
        penrose.executeMarketFn(markets, marketsData, true);
    }

    function depositAsset(uint256 amount) public {
        deal(address(asset), address(this), amount);
        asset.approve(address(yieldBox), type(uint256).max);
        asset.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(address(bigBang), true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(
            1155, address(yieldBox), assetYieldBoxId, address(bigBang), type(uint200).max, uint48(block.timestamp)
        );
    }

    function depositCollateral(uint256 amount) public {
        deal(address(collateral), address(this), amount);
        collateral.approve(address(yieldBox), type(uint256).max);
        collateral.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(address(bigBang), true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(
            1155, address(yieldBox), collateralYieldBoxId, address(bigBang), type(uint200).max, uint48(block.timestamp)
        );

        uint256 share = yieldBox.toShare(collateralYieldBoxId, amount, false);
        yieldBox.depositAsset(collateralYieldBoxId, address(this), address(this), 0, share);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.addCollateral(address(this), address(this), false, 0, share);
        bigBang.execute(modules, calls, true);
    }

    function borrow(uint256 amount, bool expectRevert) public {
        (Module[] memory modules, bytes[] memory calls) = marketHelper.borrow(address(this), address(this), amount);

        if (expectRevert) vm.expectRevert();
        bigBang.execute(modules, calls, true);
    }

    function repay(uint256 part) public {
        pearlmit.approve(
            1155, address(yieldBox), assetYieldBoxId, address(bigBang), type(uint200).max, uint48(block.timestamp)
        );
        (Module[] memory modules, bytes[] memory calls) = marketHelper.repay(address(this), address(this), false, part);
        bigBang.execute(modules, calls, true);
    }

    function test_open_interest_borrow_repay_borrow_repay() public {
        // console.log ("");
        // console.log ("");
        // console.log ("");
        // console.log ("=======SCENARIO 1:====== ");
        // console.log ("      borrow - repay all - borrow - repay all - borrow - repay all ");
        // console.log ("======================== ");

        uint256 collateralAmount = 10 ether;
        uint256 borrowAmount = 1 ether;

        {
            deal(address(collateral), address(this), collateralAmount);
            asset.mint(address(this), borrowAmount * 100);
        }
        uint256 userBorrowPart;

        penrose.setBigBangEthMarket(address(bigBang));
        penrose.setBigBangEthMarketDebtRate(5e15);

        // 1
        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            // console.log ("=======BEFORE BORROW ");
            borrow(borrowAmount, false);
            // console.log ("=======AFTER BORROW ");

            vm.roll(10000);
            skip(86400 * 10);
            penrose.mintOpenInterestDebt(address(twTap));
            // prepare for repay
            yieldBox.depositAsset(assetYieldBoxId, address(this), address(this), borrowAmount * 2, 0);
            userBorrowPart = bigBang._userBorrowPart(address(this));

            // console.log ("=======BEFORE REPAY ");
            repay(bigBang._userBorrowPart(address(this)));
            // console.log ("=======AFTER REPAY ");
            penrose.mintOpenInterestDebt(address(twTap));
        }

        // 2
        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            // console.log ("=======BEFORE BORROW ");
            borrow(borrowAmount, false);
            // console.log ("=======AFTER BORROW ");
            penrose.mintOpenInterestDebt(address(twTap));

            vm.roll(10000);
            skip(86400 * 10);
            // prepare for repay
            penrose.mintOpenInterestDebt(address(twTap));
            yieldBox.depositAsset(assetYieldBoxId, address(this), address(this), borrowAmount * 2, 0);
            userBorrowPart = bigBang._userBorrowPart(address(this));

            // console.log ("=======BEFORE REPAY ");
            repay(bigBang._userBorrowPart(address(this)));
            // console.log ("=======AFTER REPAY ");
            penrose.mintOpenInterestDebt(address(twTap));
        }

        // 3
        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            // console.log ("=======BEFORE BORROW ");
            borrow(borrowAmount, false);
            // console.log ("=======AFTER BORROW ");

            vm.roll(10000);
            skip(86400 * 10);
            // prepare for repay
            yieldBox.depositAsset(assetYieldBoxId, address(this), address(this), borrowAmount * 2, 0);
            userBorrowPart = bigBang._userBorrowPart(address(this));

            penrose.mintOpenInterestDebt(address(twTap));
            repay(bigBang._userBorrowPart(address(this)));
        }

        uint256 totalMinted = asset.balanceOf(address(twTap));
        assertGt(totalMinted, 0);
        // console.log("-------------- totalMinted %s", totalMinted);
    }

    function test_open_interest_borrow_borrow_repay() public {
        // console.log ("");
        // console.log ("");
        // console.log ("");
        // console.log ("=======SCENARIO 2:====== ");
        // console.log ("      borrow - borrow - borrow - repay 1 - repay 2 ");
        // console.log ("======================== ");

        uint256 collateralAmount = 10 ether;
        uint256 borrowAmount = 1 ether;

        {
            deal(address(collateral), address(this), collateralAmount);
            asset.mint(address(this), borrowAmount * 100);
        }
        uint256 userBorrowPart;

        penrose.setBigBangEthMarket(address(bigBang));
        penrose.setBigBangEthMarketDebtRate(5e15);

        // borrow
        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            // console.log ("=======BEFORE BORROW ");
            penrose.mintOpenInterestDebt(address(twTap));
            borrow(borrowAmount, false);
            // console.log ("=======AFTER BORROW ");

            vm.roll(10000);
            skip(86400 * 10);
            penrose.mintOpenInterestDebt(address(twTap));
        }

        // borrow
        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            // console.log ("=======BEFORE BORROW ");
            penrose.mintOpenInterestDebt(address(twTap));
            borrow(borrowAmount, false);
            // console.log ("=======AFTER BORROW ");
            penrose.mintOpenInterestDebt(address(twTap));

            vm.roll(10000);
            skip(86400 * 10);
            penrose.mintOpenInterestDebt(address(twTap));
        }

        // borrow
        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            // console.log ("=======BEFORE BORROW ");
            penrose.mintOpenInterestDebt(address(twTap));
            borrow(borrowAmount, false);
            // console.log ("=======AFTER BORROW ");

            vm.roll(10000);
            skip(86400 * 10);
            penrose.mintOpenInterestDebt(address(twTap));
        }

        // repay 1
        {
            yieldBox.depositAsset(assetYieldBoxId, address(this), address(this), borrowAmount * 2, 0);
            userBorrowPart = bigBang._userBorrowPart(address(this));

            // console.log ("=======BEFORE REPAY ");
            penrose.mintOpenInterestDebt(address(twTap));
            repay(bigBang._userBorrowPart(address(this)) / 10);
            // console.log ("=======AFTER REPAY ");
            penrose.mintOpenInterestDebt(address(twTap));
        }

        // repay 2
        {
            asset.mint(address(this), borrowAmount * 100);
            // uint256 balance = asset.balanceOf(address(this));
            // console.log("-------------- balance %s", balance);
            yieldBox.depositAsset(assetYieldBoxId, address(this), address(this), borrowAmount * 2, 0);
            userBorrowPart = bigBang._userBorrowPart(address(this));

            penrose.mintOpenInterestDebt(address(twTap));
            repay(bigBang._userBorrowPart(address(this)));
            penrose.mintOpenInterestDebt(address(twTap));
        }

        uint256 totalMinted = asset.balanceOf(address(twTap));
        assertGt(totalMinted, 0);
        // console.log("-------------- totalMinted %s", totalMinted);
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
            mc[0] = address(bigBang);

            bytes[] memory data = new bytes[](1);
            data[0] = payload;
            penrose.executeMarketFn(mc, data, false);
        }

        {
            assertEq(address(bigBang._oracle()), address(toSetAddress));
            assertEq(bigBang._conservator(), toSetAddress);
            assertEq(bigBang._protocolFee(), toSetValue);
            assertEq(bigBang._minLiquidatorReward(), toSetValue);
            assertEq(bigBang._maxLiquidatorReward(), toSetMaxValue);
            assertEq(bigBang._totalBorrowCap(), toSetValue);
            assertEq(bigBang._collateralizationRate(), toSetValue);
            assertEq(bigBang._liquidationCollateralizationRate(), toSetMaxValue);
        }
    }

    function test_initialize_twice() public {
        vm.expectRevert();
        bigBang.init("");
        bigBang.accrue();
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
            mc[0] = address(bigBang);

            bytes[] memory data = new bytes[](1);
            data[0] = payload;
            penrose.executeMarketFn(mc, data, false);
        }

        //add collateral
        bigBang.updatePause(Market.PauseType.AddCollateral, true);

        Module[] memory modules;
        bytes[] memory calls;
        (modules, calls) = marketHelper.addCollateral(address(this), address(this), false, 1, 0);
        vm.expectRevert("Market: paused");
        bigBang.execute(modules, calls, true);

        //add collateral
        bigBang.updatePause(Market.PauseType.RemoveCollateral, true);
        (modules, calls) = marketHelper.removeCollateral(address(this), address(this), 1);
        vm.expectRevert("Market: paused");
        bigBang.execute(modules, calls, true);

        bigBang.updatePause(Market.PauseType.Borrow, true);
        (modules, calls) = marketHelper.borrow(address(this), address(this), 1);
        vm.expectRevert("Market: paused");
        bigBang.execute(modules, calls, true);
    }

    function test_should_borrow_without_lenders() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        deal(address(collateral), address(this), collateralAmount);

        depositCollateral(collateralAmount);

        borrow(borrowAmount, false);
    }

    function test_borrow_and_liquidate() public {
        uint256 collateralAmount = 1.2 ether;
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

        bytes memory setLiquidationMaxSlippageCall =
            abi.encodeWithSelector(Market.setLiquidationMaxSlippage.selector, 1e4); //10%

        address[] memory mc = new address[](1);
        mc[0] = address(bigBang);

        bytes[] memory data = new bytes[](1);
        data[0] = setLiquidationMaxSlippageCall;
        penrose.executeMarketFn(mc, data, false);

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

        uint256 borrowPartBefore = bigBang._userBorrowPart(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
        bigBang.execute(modules, calls, true);
        uint256 borrowPartAfter = bigBang._userBorrowPart(address(this));

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

            uint256 borrowPartBefore = bigBang._userBorrowPart(address(this));
            (Module[] memory modules, bytes[] memory calls) =
                marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
            vm.expectRevert();
            bigBang.execute(modules, calls, true);
            uint256 borrowPartAfter = bigBang._userBorrowPart(address(this));
            assertEq(borrowPartBefore, borrowPartAfter);
        }

        //use liquidateBadDebt
        {
            uint256 borrowPartBefore = bigBang._userBorrowPart(address(this));
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
            asset.approve(address(bigBang), type(uint256).max);
            bytes memory badDebtCall = abi.encodeWithSelector(BigBang.execute.selector, modules, calls, true);

            address[] memory mc = new address[](1);
            mc[0] = address(bigBang);

            bytes[] memory data = new bytes[](1);
            data[0] = badDebtCall;
            penrose.executeMarketFn(mc, data, false);
            uint256 borrowPartAfter = bigBang._userBorrowPart(address(this));
            assertGt(borrowPartBefore, borrowPartAfter);
        }
    }

    function test_bb_magnetar_helper_info() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        penrose.setBigBangEthMarket(address(bigBang));

        {
            deal(address(collateral), address(this), collateralAmount);
            deal(address(asset), address(this), borrowAmount * 2);
        }

        {
            depositAsset(borrowAmount * 2);

            depositCollateral(collateralAmount);

            borrow(borrowAmount, false);
        }

        IBigBang[] memory markets = new IBigBang[](1);
        markets[0] = IBigBang(address(bigBang));
        MagnetarHelper.BigBangInfo[] memory info = magnetarHelper.bigBangMarketInfo(address(this), markets);

        assertEq(info[0].market.collateral, address(collateral));
        assertEq(info[0].market.asset, address(asset));
        assertEq(info[0].market.userCollateralShare, bigBang._userCollateralShare(address(this)));
        assertEq(info[0].market.userBorrowPart, bigBang._userBorrowPart(address(this)));

        uint256 borrowAmountFromHelper = magnetarHelper.getAmountForBorrowPart(
            IMarket(address(bigBang)), bigBang._userBorrowPart(address(this)), false
        );
        assertGe(borrowAmountFromHelper, borrowAmount);
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

        uint256 borrowPart = bigBang._userBorrowPart(address(this));
        assertGt(borrowPart, 0);

        vm.startPrank(userA);
        asset.approve(address(yieldBox), type(uint256).max);
        asset.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(address(bigBang), true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(
            1155, address(yieldBox), assetYieldBoxId, address(bigBang), type(uint200).max, uint48(block.timestamp)
        );

        vm.stopPrank();

        bigBang.approveBorrow(address(userA), type(uint256).max);
        bigBang.approve(address(userA), type(uint256).max);

        deal(address(asset), address(userA), borrowAmount * 2);

        uint256 share = yieldBox.toShare(assetYieldBoxId, borrowAmount * 2, false);
        vm.prank(userA);
        yieldBox.depositAsset(assetYieldBoxId, address(userA), address(userA), 0, share);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.repay(address(userA), address(this), false, borrowPart);
        vm.prank(userA);
        bigBang.execute(modules, calls, true);

        uint256 borrowPartAfter = bigBang._userBorrowPart(address(this));
        assertEq(borrowPartAfter, 0);
    }
}
