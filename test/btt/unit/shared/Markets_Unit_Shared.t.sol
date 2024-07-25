// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// mocks
import {OracleMock_test} from "../../mocks/OracleMock_test.sol";
import {ERC20Mock_test} from "../../mocks/ERC20Mock_test.sol";
import {UsdoMock_test} from "../../mocks/UsdoMock_test.sol";

// utils
import {YieldBoxTestUtils} from "../../utils/YieldBoxTestUtils.sol";

// contracts
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {SGLLiquidation} from "contracts/markets/singularity/SGLLiquidation.sol";
import {SGLCollateral} from "contracts/markets/singularity/SGLCollateral.sol";
import {SGLLeverage} from "contracts/markets/singularity/SGLLeverage.sol";
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {SGLBorrow} from "contracts/markets/singularity/SGLBorrow.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {Penrose} from "contracts/Penrose.sol";

import {BBLiquidation} from "contracts/markets/bigBang/BBLiquidation.sol";
import {BBCollateral} from "contracts/markets/bigBang/BBCollateral.sol";
import {BBLeverage} from "contracts/markets/bigBang/BBLeverage.sol";
import {BBBorrow} from "contracts/markets/bigBang/BBBorrow.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

import {TapiocaOmnichainExtExec} from "tapioca-periph/tapiocaOmnichainEngine/extension/TapiocaOmnichainExtExec.sol";
import {UsdoMarketReceiverModule} from "contracts/usdo/modules/UsdoMarketReceiverModule.sol";
import {UsdoOptionReceiverModule} from "contracts/usdo/modules/UsdoOptionReceiverModule.sol";
import {UsdoReceiver} from "contracts/usdo/modules/UsdoReceiver.sol";
import {UsdoSender} from "contracts/usdo/modules/UsdoSender.sol";
import {IUsdo, UsdoInitStruct, UsdoModulesInitStruct} from "tapioca-periph/interfaces/oft/IUsdo.sol";

// dependencies
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IOracle} from "tapioca-periph/oracle/interfaces/IOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";

import {Base_Test} from "../../Base_Test.t.sol";

abstract contract Markets_Unit_Shared is Base_Test {
    ERC20Mock_test nonMainToken;
    uint256 nonMainTokenId;
    ERC20Mock_test mainToken;
    uint256 mainTokenId;
    UsdoMock_test usdo;
    uint256 usdoId;
    ERC20Mock_test tapToken;
    uint256 tapId;
    Cluster cluster;
    Penrose penrose;
    OracleMock_test oracle;

    struct TestSingularityData {
        address penrose;
        IERC20 asset;
        uint256 assetId;
        IERC20 collateral;
        uint256 collateralId;
        IOracle oracle;
        ILeverageExecutor leverageExecutor;
    }

    struct TestBigBangData {
        address penrose;
        address collateral;
        uint256 collateralId;
        ITapiocaOracle oracle;
        ILeverageExecutor leverageExecutor;
        uint256 debtRateAgainstEth;
        uint256 debtRateMin;
        uint256 debtRateMax;
    }

    function setUp() public virtual override {
        super.setUp();

        YieldBoxTestUtils ybUtils = new YieldBoxTestUtils();

        mainToken = new ERC20Mock_test("mainToken", "mainToken");
        vm.label(address(mainToken), "mainToken Mock");

        nonMainToken = new ERC20Mock_test("nonMainToken", "nonMainToken");
        vm.label(address(nonMainToken), "nonMainToken Mock");

        TapiocaOmnichainExtExec extExec = new TapiocaOmnichainExtExec();
        vm.label(address(extExec), "TapiocaOmnichainExtExec");

        UsdoInitStruct memory usdoInitStruct = UsdoInitStruct({
            endpoint: address(endpoints[aEid]),
            delegate: address(this),
            yieldBox: address(yieldBox),
            cluster: address(cluster),
            extExec: address(extExec),
            pearlmit: IPearlmit(address(pearlmit))
        });
        UsdoSender usdoSender = new UsdoSender(usdoInitStruct);
        UsdoReceiver usdoReceiver = new UsdoReceiver(usdoInitStruct);
        UsdoMarketReceiverModule usdoMarketReceiverModule = new UsdoMarketReceiverModule(usdoInitStruct);
        UsdoOptionReceiverModule usdoOptionsReceiverModule = new UsdoOptionReceiverModule(usdoInitStruct);
        vm.label(address(usdoSender), "usdoSender");
        vm.label(address(usdoReceiver), "usdoReceiver");
        vm.label(address(usdoMarketReceiverModule), "usdoMarketReceiverModule");
        vm.label(address(usdoOptionsReceiverModule), "usdoOptionsReceiverModule");

        UsdoModulesInitStruct memory usdoModulesInitStruct = UsdoModulesInitStruct({
            usdoSenderModule: address(usdoSender),
            usdoReceiverModule: address(usdoReceiver),
            marketReceiverModule: address(usdoMarketReceiverModule),
            optionReceiverModule: address(usdoOptionsReceiverModule)
        });
        usdo = UsdoMock_test(
            payable(_deployOApp(type(UsdoMock_test).creationCode, abi.encode(usdoInitStruct, usdoModulesInitStruct)))
        );
        vm.label(address(usdo), "Usdo Mock");

        ERC20WithoutStrategy mainTokenStrategy = ybUtils.createEmptyStrategy(address(yieldBox), address(mainToken));
        vm.label(address(mainTokenStrategy), "mainTokenStrategy");
        mainTokenId =
            yieldBox.registerAsset(TokenType.ERC20, address(mainToken), IStrategy(address(mainTokenStrategy)), 0);

        ERC20WithoutStrategy nonMainTokenStrategy =
            ybUtils.createEmptyStrategy(address(yieldBox), address(nonMainToken));
        vm.label(address(nonMainTokenStrategy), "nonMainTokenStrategy");
        nonMainTokenId =
            yieldBox.registerAsset(TokenType.ERC20, address(nonMainToken), IStrategy(address(nonMainTokenStrategy)), 0);

        ERC20WithoutStrategy usdoStrategy = ybUtils.createEmptyStrategy(address(yieldBox), address(usdo));
        vm.label(address(usdoStrategy), "usdoStrategy");
        usdoId = yieldBox.registerAsset(TokenType.ERC20, address(usdo), IStrategy(address(usdoStrategy)), 0);

        tapToken = new ERC20Mock_test("tapToken", "tapToken");
        vm.label(address(tapToken), "tapToken Mock");

        ERC20WithoutStrategy tapStrategy = ybUtils.createEmptyStrategy(address(yieldBox), address(tapToken));
        vm.label(address(tapStrategy), "tapStrategy");
        tapId = yieldBox.registerAsset(TokenType.ERC20, address(tapToken), IStrategy(address(tapStrategy)), 0);

        cluster = new Cluster(0, address(this));
        vm.label(address(cluster), "Cluster Test");

        penrose = new Penrose(
            IYieldBox(address(yieldBox)),
            ICluster(address(cluster)),
            IERC20(address(tapToken)),
            IERC20(address(mainToken)),
            IPearlmit(address(pearlmit)),
            tapId,
            mainTokenId,
            address(this)
        );

        oracle = new OracleMock_test("A", "A", 1 ether);
    }

    function _getSingularityInitData(TestSingularityData memory _sgl, address _penrose)
        internal
        returns (
            Singularity._InitMemoryModulesData memory modulesData,
            Singularity._InitMemoryTokensData memory tokensData,
            Singularity._InitMemoryData memory data
        )
    {
        SGLLiquidation sglLiq = new SGLLiquidation();
        SGLBorrow sglBorrow = new SGLBorrow();
        SGLCollateral sglCollateral = new SGLCollateral();
        SGLLeverage sglLev = new SGLLeverage();

        modulesData = Singularity._InitMemoryModulesData(
            address(sglLiq), address(sglBorrow), address(sglCollateral), address(sglLev)
        );

        tokensData = Singularity._InitMemoryTokensData(_sgl.asset, _sgl.assetId, _sgl.collateral, _sgl.collateralId);

        data = Singularity._InitMemoryData(
            IPenrose(_penrose), ITapiocaOracle(address(_sgl.oracle)), 0, 75000, 80000, _sgl.leverageExecutor
        );
    }

    function _getBigBangInitData(TestBigBangData memory _bb)
        internal
        returns (
            BigBang._InitMemoryModulesData memory modulesData,
            BigBang._InitMemoryDebtData memory debtData,
            BigBang._InitMemoryData memory data
        )
    {
        BBLiquidation bbLiq = new BBLiquidation();
        BBBorrow bbBorrow = new BBBorrow();
        BBCollateral bbCollateral = new BBCollateral();
        BBLeverage bbLev = new BBLeverage();

        modulesData =
            BigBang._InitMemoryModulesData(address(bbLiq), address(bbBorrow), address(bbCollateral), address(bbLev));

        debtData = BigBang._InitMemoryDebtData(_bb.debtRateAgainstEth, _bb.debtRateMin, _bb.debtRateMax);

        data = BigBang._InitMemoryData(
            IPenrose(_bb.penrose),
            IERC20(_bb.collateral),
            _bb.collateralId,
            ITapiocaOracle(address(_bb.oracle)),
            0,
            75000,
            80000,
            _bb.leverageExecutor
        );
    }
}
