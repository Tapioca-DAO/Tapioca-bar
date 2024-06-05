// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {Origins} from "contracts/markets/origins/Origins.sol";
import {Market} from "contracts/markets/Market.sol";

import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";

// import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
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

import {MagnetarMock} from "../mocks/MagnetarMock.sol";
import {OracleMock} from "../mocks/OracleMock.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {TwTapMock} from "../mocks/TwTapMock.sol";
import {UsdoMock} from "../mocks/UsdoMock.sol";
import {TOFTMock} from "../mocks/TOFTMock.sol";

import {UsdoHelper} from "contracts/usdo/extensions/UsdoHelper.sol";
import {UsdoSender} from "contracts/usdo/modules/UsdoSender.sol";

import {UsdoTestHelper, TestPenroseData} from "../helpers/UsdoTestHelper.t.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

import "forge-std/Test.sol";

contract OriginsTest is UsdoTestHelper {
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

    Penrose penrose;
    OracleMock oracle;

    Origins origins;

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

        setUpEndpoints(3, LibraryType.UltraLightNode);

        {
            pearlmit = new Pearlmit("Pearlmit", "1", address(this), 0);
            yieldBox = createYieldBox(pearlmit, address(this));
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

        (penrose,) = createPenrose(
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
        origins = createOrigins(
            address(this),
            address(yieldBox),
            address(asset),
            assetYieldBoxId,
            address(collateral),
            collateralYieldBoxId,
            ITapiocaOracle(address(oracle)),
            0,
            99999
        );

        vm.label(address(origins), "Origins");

        penrose.addOriginsMarket(address(origins));
    }

    function depositAsset(uint256 amount) public {
        deal(address(asset), address(this), amount);
        asset.approve(address(yieldBox), type(uint256).max);
        yieldBox.setApprovalForAll(address(origins), true);
    }

    function depositCollateral(uint256 amount) public {
        deal(address(collateral), address(this), amount);
        collateral.approve(address(yieldBox), type(uint256).max);
        yieldBox.setApprovalForAll(address(origins), true);

        uint256 share = yieldBox.toShare(collateralYieldBoxId, amount, false);
        yieldBox.depositAsset(collateralYieldBoxId, address(this), address(this), 0, share);
        origins.addCollateral(0, share);
    }

    function borrow(uint256 amount, bool expectRevert) public {
        if (expectRevert) vm.expectRevert();
        origins.borrow(amount);
    }

    function repay(uint256 part) public {
        origins.repay(part);
    }

    function test_setMarketConfig() public {
        address toSetAddress = address(userA);
        uint256 toSetValue = 101;
        uint256 toSetMaxValue = 102;
        {
            origins.setMarketConfig(
                ITapiocaOracle(toSetAddress),
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
        }

        {
            assertEq(address(origins._oracle()), address(toSetAddress));
            assertEq(origins._conservator(), toSetAddress);
            assertEq(origins._protocolFee(), toSetValue);
            assertEq(origins._minLiquidatorReward(), toSetValue);
            assertEq(origins._maxLiquidatorReward(), toSetMaxValue);
            assertEq(origins._totalBorrowCap(), toSetValue);
            assertEq(origins._collateralizationRate(), toSetValue);
            assertEq(origins._liquidationCollateralizationRate(), toSetMaxValue);
        }
    }

    function test_should_not_work_when_paused() public {
        {
            origins.setMarketConfig(
                ITapiocaOracle(address(0)),
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
        }

        //add collateral
        origins.updatePause(Market.PauseType.AddCollateral, true);

        vm.expectRevert("Market: paused");
        origins.addCollateral(1, 0);

        //add collateral
        origins.updatePause(Market.PauseType.RemoveCollateral, true);
        vm.expectRevert("Market: paused");
        origins.removeCollateral(1);

        origins.updatePause(Market.PauseType.Borrow, true);
        vm.expectRevert("Market: paused");
        origins.borrow(1);
    }

    function test_origin_should_borrow_max() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 9e17;

        deal(address(collateral), address(this), collateralAmount);

        depositCollateral(collateralAmount);

        borrow(borrowAmount, false);
    }

    function test_origin_should_borrow_max_2000_ether() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 1900e18;

        oracle.set(5e14);
        origins.updateExchangeRate();

        deal(address(collateral), address(this), collateralAmount);

        depositCollateral(collateralAmount);

        borrow(borrowAmount, false);

        borrow(100e18, true);
    }

    function test_should_borrow_without_lenders() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        deal(address(collateral), address(this), collateralAmount);

        depositCollateral(collateralAmount);

        borrow(borrowAmount, false);
    }

    function test_should_borrow_and_repay() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        deal(address(asset), address(this), borrowAmount);
        deal(address(collateral), address(this), collateralAmount);

        depositCollateral(collateralAmount);

        borrow(borrowAmount, false);

        depositAsset(borrowAmount);

        repay(borrowAmount);

        uint256 borrowPart = origins._userBorrowPart(address(this));
        assertEq(borrowPart, 0);
    }

    function test_only_allowed_users() public {
        uint256 collateralAmount = 1 ether;

        deal(address(collateral), address(this), collateralAmount);
        collateral.approve(address(yieldBox), type(uint256).max);
        yieldBox.setApprovalForAll(address(origins), true);

        uint256 share = yieldBox.toShare(collateralYieldBoxId, collateralAmount, false);
        yieldBox.depositAsset(collateralYieldBoxId, address(this), address(this), 0, share);

        vm.startPrank(userA);
        vm.expectRevert(Origins.NotAuthorized.selector);
        origins.addCollateral(0, share);
        vm.stopPrank();
    }

    function test_time_updates() public {
        uint256 collateralAmount = 1 ether;
        uint256 borrowAmount = 5e17;

        deal(address(asset), address(this), borrowAmount);
        deal(address(collateral), address(this), collateralAmount);

        depositCollateral(collateralAmount);

        borrow(borrowAmount, false);

        skip(86400 * 1000);

        uint256 borrowPart = origins._userBorrowPart(address(this));
        assertEq(borrowPart, borrowAmount);

        depositAsset(borrowAmount);

        repay(borrowAmount);
        borrowPart = origins._userBorrowPart(address(this));
        assertEq(borrowPart, 0);
    }
}
