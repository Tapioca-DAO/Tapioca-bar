// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.22;

import "forge-std/Test.sol";

// External
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// Tapioca
import {Pearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {Penrose} from "contracts/Penrose.sol";

// Tapioca Tests
import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";
import {UsdoTestHelper, TestPenroseData, TestSingularityData} from "./helpers/UsdoTestHelper.t.sol";
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {TapiocaOptionsBrokerMock} from "./mocks/TapiocaOptionsBrokerMock.sol";
import {IMarket} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {ITwTap} from "tapioca-periph/interfaces/tap-token/ITwTap.sol";
import {IOracle} from "tapioca-periph/oracle/interfaces/IOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {MagnetarMock} from "./mocks/MagnetarMock.sol";
import {SwapperMock} from "./mocks/SwapperMock.sol";
import {OracleMock} from "./mocks/OracleMock.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {UsdoMock} from "./mocks/UsdoMock.sol";

contract PenroseTest is UsdoTestHelper {
    uint32 aEid = 1;
    uint32 bEid = 2;

    Pearlmit pearlmit;
    Cluster cluster;
    YieldBox yieldBox;

    ERC20Mock tapOFT;
    ERC20Mock weth;

    ERC20Mock collateral;
    ERC20Mock asset;

    MagnetarMock magnetar;

    SimpleLeverageExecutor leverageExecutor;
    Singularity masterContract;
    Singularity singularity;
    SwapperMock swapper;
    OracleMock oracle;
    Penrose penrose;

    uint256 collateralYieldBoxId;
    uint256 assetYieldBoxId;

    uint256 internal userAPKey = 0x1;
    uint256 internal userBPKey = 0x2;
    address public userA = vm.addr(userAPKey);
    address public userB = vm.addr(userBPKey);
    uint256 public initialBalance = 100 ether;

    /**
     * DEPLOY setup addresses
     */
    address __endpoint;
    uint256 __hostEid = aEid;
    address __owner = address(this);

    function setUp() public override {
        {
            pearlmit = new Pearlmit("Pearlmit", "1", address(this), 0);
            yieldBox = createYieldBox();
            cluster = createCluster(aEid, __owner);
            magnetar = createMagnetar(address(cluster), IPearlmit(address(pearlmit)));

            setUpEndpoints(3, LibraryType.UltraLightNode);

            vm.label(address(endpoints[aEid]), "aEndpoint");
            vm.label(address(endpoints[bEid]), "bEndpoint");
            vm.label(address(yieldBox), "YieldBox");
            vm.label(address(cluster), "Cluster");
            vm.label(address(magnetar), "Magnetar");
            vm.label(address(pearlmit), "Pearlmit");

            // Setup YieldBox assets
            asset = new ERC20Mock("Asset", "asset");
            vm.label(address(asset), "asset");

            collateral = new ERC20Mock("Collateral", "coll");
            vm.label(address(collateral), "collateral");

            ERC20WithoutStrategy assetStrategy = createYieldBoxEmptyStrategy(address(yieldBox), address(asset));
            ERC20WithoutStrategy collateralStrategy =
                createYieldBoxEmptyStrategy(address(yieldBox), address(collateral));

            assetYieldBoxId = registerYieldBoxAsset(address(yieldBox), address(asset), address(assetStrategy));
            collateralYieldBoxId =
                registerYieldBoxAsset(address(yieldBox), address(collateral), address(collateralStrategy));
        }

        {
            tapOFT = new ERC20Mock("Tapioca OFT", "TAP");
            vm.label(address(tapOFT), "tapOFT");

            weth = new ERC20Mock("Wrapped Ethereum", "WETH");
            vm.label(address(weth), "WETH");
        }

        (penrose, masterContract) = createPenrose(
            TestPenroseData(
                address(yieldBox),
                address(cluster),
                address(tapOFT),
                address(weth),
                IPearlmit(address(pearlmit)),
                __owner
            )
        );

        leverageExecutor =
            createLeverageExecutor(address(yieldBox), address(swapper), address(cluster), address(pearlmit));
        (penrose, masterContract) = createPenrose(
            TestPenroseData(
                address(yieldBox),
                address(cluster),
                address(tapOFT),
                address(weth),
                IPearlmit(address(pearlmit)),
                __owner
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

        cluster.updateContract(0, address(yieldBox), true);
        cluster.updateContract(0, address(magnetar), true);
        cluster.updateContract(0, address(swapper), true);
        cluster.updateContract(0, address(penrose), true);
        cluster.updateContract(0, address(masterContract), true);
        cluster.updateContract(0, address(oracle), true);
        cluster.updateContract(0, address(singularity), true);
        cluster.updateContract(0, address(asset), true);
        cluster.updateContract(0, address(collateral), true);
    }
    function test_penrose_unregister_singularity() public {
        penrose.unregisterContract(address(singularity), 0);
        address[] memory markets = penrose.singularityMarkets();
        assertEq(markets.length, 0);
    }
    function test_penrose_list_markets() public {
        address[] memory markets = penrose.singularityMarkets();
        assertLe(markets.length, 1);
    }

    function test_penrose_mc_length() public {
        uint256 length = penrose.singularityMasterContractLength();
        assertGt(length, 0);
    }

    function test_penrose_list_singularity_markets() public {
        address[] memory markets = penrose.singularityMarkets();

        bool isMarketRegistered = penrose.isMarketRegistered(markets[0]);
        assertTrue(isMarketRegistered);

        isMarketRegistered = penrose.isMarketRegistered(address(penrose));
        assertFalse(isMarketRegistered);
    }

    function test_penrose_should_not_register_without_mc() public {
        vm.expectRevert();
        penrose.registerSingularity(address(0), "", false);
    }

    function test_penrose_should_not_register_same_mc() public {
        vm.expectRevert();
        penrose.registerSingularityMasterContract(address(masterContract), IPenrose.ContractType.mediumRisk);
    }

    function test_penrose_should_not_execute_without_mc() public {
        address[] memory mc = new address[](1);
        mc[0] = address(0);

        bytes[] memory data = new bytes[](1);
        data[0] = "";

        vm.expectRevert();
        penrose.executeMarketFn(mc, data, true);
    }

    function test_penrose_should_not_withdraw_when_paused() public {
        penrose.setConservator(address(this));
        penrose.updatePause(true);

        IMarket[] memory markets = new IMarket[](1);
        markets[0] = IMarket(address(0));

        vm.expectRevert();
        penrose.withdrawAllMarketFees(markets, ITwTap(address(0)));
    }

    function test_penrose_register_mc() public {
        Singularity newMc = new Singularity();

        uint256 mcLengthBefore = penrose.singularityMasterContractLength();
        penrose.registerSingularityMasterContract(address(newMc), IPenrose.ContractType.mediumRisk);
        uint256 mcLengthAfter = penrose.singularityMasterContractLength();
        assertGt(mcLengthAfter, mcLengthBefore);
    }
}
