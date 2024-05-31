// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.22;

// Lz
import {TestHelper} from "../LZSetup/TestHelper.sol";

// External
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// Tapioca
import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {SGLInterestHelper} from "contracts/markets/singularity/SGLInterestHelper.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {SGLLiquidation} from "contracts/markets/singularity/SGLLiquidation.sol";
import {SGLCollateral} from "contracts/markets/singularity/SGLCollateral.sol";
import {SGLLeverage} from "contracts/markets/singularity/SGLLeverage.sol";
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SGLBorrow} from "contracts/markets/singularity/SGLBorrow.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {IOracle} from "tapioca-periph/oracle/interfaces/IOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";
import {MagnetarMock} from "../mocks/MagnetarMock.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {Penrose} from "contracts/Penrose.sol";
import {SwapperMock} from "../mocks/SwapperMock.sol";
import {OracleMock} from "../mocks/OracleMock.sol";
import {TestUtils} from "../TestUtils.t.sol";

import {BBLiquidation} from "contracts/markets/bigBang/BBLiquidation.sol";
import {BBCollateral} from "contracts/markets/bigBang/BBCollateral.sol";
import {BBLeverage} from "contracts/markets/bigBang/BBLeverage.sol";
import {BBBorrow} from "contracts/markets/bigBang/BBBorrow.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

import {Origins} from "contracts/markets/origins/Origins.sol";

struct TestPenroseData {
    address yb;
    address cluster;
    address tap;
    address token;
    IPearlmit pearlmit;
    address owner;
}

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

contract UsdoTestHelper is TestHelper, TestUtils {
    function createYieldBoxEmptyStrategy(address _yieldBox, address _erc20) public returns (ERC20WithoutStrategy) {
        return new ERC20WithoutStrategy(IYieldBox(_yieldBox), IERC20(_erc20));
    }

    function registerYieldBoxAsset(address _yieldBox, address _token, address _strategy) public returns (uint256) {
        return YieldBox(_yieldBox).registerAsset(TokenType.ERC20, _token, IStrategy(_strategy), 0);
    }

    function createMagnetar(address cluster, IPearlmit _pearlmit) public returns (MagnetarMock) {
        return new MagnetarMock(cluster, _pearlmit);
    }

    function createYieldBox() public returns (YieldBox) {
        YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();

        return new YieldBox(IWrappedNative(address(0)), uriBuilder);
    }

    function createCluster(uint32 hostEid, address owner) public returns (Cluster) {
        return new Cluster(hostEid, owner);
    }

    function createSwapper(YieldBox _yb) public returns (SwapperMock) {
        return new SwapperMock(_yb);
    }

    function createOracle() public returns (OracleMock) {
        return new OracleMock("Oracle Test", "ORCT", 1 ether);
    }

    function createLeverageExecutor(address, address _swapper, address _cluster)
        public
        returns (SimpleLeverageExecutor)
    {
        return new SimpleLeverageExecutor(IZeroXSwapper(_swapper), ICluster(_cluster), address(0));
    }

    function createPenrose(TestPenroseData memory _data) public returns (Penrose pen, Singularity mediumRiskMC) {
        address tapStrat = address(createYieldBoxEmptyStrategy(_data.yb, _data.tap));
        address tokenStrat = address(createYieldBoxEmptyStrategy(_data.yb, _data.token));

        uint256 tapAssetId = IYieldBox(_data.yb).registerAsset(TokenType.ERC20, _data.tap, tapStrat, 0);
        uint256 tokenAssetId = IYieldBox(_data.yb).registerAsset(TokenType.ERC20, _data.token, tokenStrat, 0);

        pen = new Penrose(
            IYieldBox(_data.yb),
            ICluster(_data.cluster),
            IERC20(_data.tap),
            IERC20(_data.token),
            _data.pearlmit,
            tapAssetId,
            tokenAssetId,
            _data.owner
        );
        mediumRiskMC = new Singularity();

        pen.registerSingularityMasterContract(address(mediumRiskMC), IPenrose.ContractType.mediumRisk);
    }

    function createOrigins(
        address owner,
        address yb,
        address asset,
        uint256 assetId,
        address collateral,
        uint256 collateralId,
        ITapiocaOracle oracle,
        uint256 exchangePrecision,
        uint256 collateralizationRate
    ) public returns (Origins) {
        return new Origins(
            owner,
            yb,
            IERC20(asset),
            assetId,
            IERC20(collateral),
            collateralId,
            oracle,
            exchangePrecision,
            collateralizationRate
        );
    }

    function createBigBang(TestBigBangData memory _bb, address _mc) public returns (BigBang) {
        BigBang bb = new BigBang();

        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(_bb);

        {
            bb.init(abi.encode(initModulesData, initDebtData, initMemoryData));
        }

        {
            Penrose(_bb.penrose).addBigBang(_mc, address(bb));
        }

        return bb;
    }

    function _getBigBangInitData(TestBigBangData memory _bb)
        private
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

    function createSingularity(Penrose _penrose, TestSingularityData memory _sgl, address _mc)
        public
        returns (Singularity)
    {
        Singularity sgl = new Singularity();
        (
            Singularity._InitMemoryModulesData memory _modulesData,
            Singularity._InitMemoryTokensData memory _tokensData,
            Singularity._InitMemoryData memory _data
        ) = _getSingularityInitData(_sgl, address(_penrose));
        {
            sgl.init(abi.encode(_modulesData, _tokensData, _data));
        }

        {
            _penrose.addSingularity(_mc, address(sgl));
        }

        {
            SGLInterestHelper sglInterestHelper = new SGLInterestHelper();

            bytes memory payload = abi.encodeWithSelector(
                Singularity.setSingularityConfig.selector,
                sgl.borrowOpeningFee(),
                0,
                0,
                0,
                0,
                0,
                0,
                address(sglInterestHelper)
            );
            address[] memory mc = new address[](1);
            mc[0] = address(sgl);

            bytes[] memory data = new bytes[](1);
            data[0] = payload;
            _penrose.executeMarketFn(mc, data, false);
        }

        return sgl;
    }

    function _getSingularityInitData(TestSingularityData memory _sgl, address _penrose)
        private
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
}
