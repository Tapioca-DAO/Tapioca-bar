// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {
    WETH9Mock, 
    ERC20Mock, 
    Pearlmit,
    YieldBoxURIBuilder, 
    YieldBox, 
    Cluster, 
    Penrose,
    BigBang,
    BBBorrow,
    BBCollateral,
    BBLeverage,
    BBLiquidation,
    Singularity,
    SGLBorrow,
    SGLCollateral,
    SGLLeverage,
    SGLLiquidation,
    MarketHelper
    } from "./base/BaseStorage.t.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";

// Test Contracts
import {Actor} from "./utils/Actor.sol";
import {BaseTest} from "./base/BaseTest.t.sol";
import {OracleMock} from "test/OracleMock.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";

// Interfaces
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {
    ERC20WithoutStrategy, IStrategy, IYieldBox as IBoringYieldBox
} from "yieldbox/strategies/ERC20WithoutStrategy.sol";

/// @title Setup
/// @notice Setup contract for the invariant test Suite, inherited by Tester
contract Setup is BaseTest {
    function _setUpBigBang() internal {
        // Deploy core protcol contracts
        _deployCore();

        // Deploy a BigBang market
        _deployBigBang();
    }

    function _setUpSingularity() internal {
        // Deploy core protcol contracts
        _deployCore();

        // Deploy a Singularity market
        _deploySingularity();
    }

    function _deployCore() internal {
        // Oracle Mock WETH/USD WETH/USD0
        oracle = new OracleMock("Oracle Test", "ORCT", 1 ether);

        // Deploy Tokens
        weth9Mock = new WETH9Mock();
        erc20Mock = new ERC20Mock('USDC Mock', 'USDC');

        baseAssets.push(address(weth9Mock));
        baseAssets.push(address(erc20Mock));

        // Deploy periphery

        //Deploy permit
        pearlmit = new Pearlmit("Pearlmit", "1");
        
        // Deploy Yieldbox
        yieldboxURIBuilder = new YieldBoxURIBuilder();
        yieldbox = new YieldBox(IWrappedNative(address(0)), yieldboxURIBuilder);

        // Setup Yieldbox assets
        ERC20WithoutStrategy _strategy = new ERC20WithoutStrategy(IYieldBox(address(yieldbox)), IERC20(address(weth9Mock)));
        yieldbox.registerAsset(TokenType.ERC20, address(weth9Mock), IStrategy(address(_strategy)), 0);

        // Deploy Cluster
        cluster = new Cluster(1, address(this));

        // Deploy MarketHelper
        marketHelper = new MarketHelper();

        // Deploy Penrose
        penrose = new Penrose(
            IYieldBox(address(yieldbox)),
            ICluster(address(cluster)),
            IERC20(address(weth9Mock)),
            IERC20(address(erc20Mock)),
            IPearlmit(address(pearlmit)),
            address(this)
        );
    }

    function _deployBigBang() internal {
        BigBang _mc = new BigBang();
        penrose.registerBigBangMasterContract(address(_mc), IPenrose.ContractType.mediumRisk);

        // Deploy BigBang modules
        bbCollateral = new BBCollateral();
        bbBorrow = new BBBorrow();
        bbLiquidation = new BBLiquidation();
        bbLeverage = new BBLeverage();

        // Deploy BigBang market
        bigBang = new BigBang();

        // Initialize the BigBang market
        BigBang._InitMemoryModulesData memory _memoryModulesData = BigBang._InitMemoryModulesData({
            _liquidationModule: address(bbLiquidation),
            _borrowModule: address(bbLeverage),
            _collateralModule: address(bbCollateral),
            _leverageModule: address(bbBorrow)
        });

        BigBang._InitMemoryDebtData memory _memoryDebtData =  BigBang._InitMemoryDebtData({
            _debtRateAgainstEth: uint256(0),
            _debtRateMin: uint256(0),
            _debtRateMax: uint256(0)
        });

        BigBang._InitMemoryData memory _memoryData =  BigBang._InitMemoryData({
            _penrose: IPenrose(address(penrose)),
            _collateral: IERC20(address(erc20Mock)),
            _collateralId: uint256(0),
            _oracle: ITapiocaOracle(address(oracle)),
            _exchangeRatePrecision: uint256(0),
            _collateralizationRate: uint256(0),
            _liquidationCollateralizationRate: uint256(0),
            _leverageExecutor: ILeverageExecutor(address(bbLeverage))
        });

        bytes memory _bbData = abi.encode(
            _memoryModulesData, 
            _memoryDebtData, 
            _memoryData
        );

        bigBang.init(_bbData);

        // Register BigBang in Penrose
        penrose.addBigBang(address(_mc), address(bigBang));

        /// Set target and target type @dev invariant testing purposes
        target = address(bigBang);
        targetType = MarketType.BIGBANG;
    }

    function _deploySingularity() internal {
        // Register Singularity Master contract in Penrose
        Singularity _mc = new Singularity();
        penrose.registerSingularityMasterContract(address(_mc), IPenrose.ContractType.mediumRisk);

        // Deploy Singularity modules
        sglLiquidation = new SGLLiquidation();
        sglBorrow = new SGLBorrow();
        sglCollateral = new SGLCollateral();
        sglLeverage = new SGLLeverage();

        // Deploy Singularity market
        singularity = new Singularity();

        // Initialize the Singularity market
        Singularity._InitMemoryModulesData memory modulesData = Singularity._InitMemoryModulesData(
            address(sglLiquidation), address(sglBorrow), address(sglCollateral), address(sglLeverage)
        );

        Singularity._InitMemoryTokensData memory tokensData = Singularity._InitMemoryTokensData(
            IERC20(address(weth9Mock)), uint256(0), IERC20(address(erc20Mock)), uint256(0)
        );

        Singularity._InitMemoryData memory data = Singularity._InitMemoryData(
            IPenrose(address(penrose)), ITapiocaOracle(address(oracle)), 0, 75000, 80000, ILeverageExecutor(address(sglLeverage))
        );

        singularity.init(abi.encode(modulesData, tokensData, data));

        // Register Singularity in Penrose
        penrose.addSingularity(address(_mc), address(singularity));

        /// Set target and target type @dev invariant testing purposes
        target = address(singularity);
        targetType = MarketType.SINGULARITY;
    }

    function _setUpActors() internal {
        address[] memory addresses = new address[](3);
        addresses[0] = USER1;
        addresses[1] = USER2;
        addresses[2] = USER3;

        address[] memory tokens = new address[](3);
        tokens[0] = address(weth9Mock);
        tokens[1] = address(erc20Mock);

        address[] memory _contracts = new address[](2);
        _contracts[0] = address(penrose);
        _contracts[1] = address(bigBang);
        _contracts[2] = address(singularity);


        for (uint256 i = 0; i < NUMBER_OF_ACTORS; i++) {
            // Deply actor proxies and approve system contracts
            address _actor = _setUpActor(addresses[i], tokens, _contracts);

            // Mint initial balances to actors
            for (uint256 j = 0; j < tokens.length; j++) {
                ERC20Mock _token = ERC20Mock(tokens[j]);
                _token.mint(_actor, INITIAL_BALANCE);
            }
            actorAddresses.push(_actor);
        }
    }

    function _setUpActor(
        address userAddress,
        address[] memory tokens,
        address[] memory callers
    ) internal returns (address actorAddress) {
        bool success;
        Actor _actor = new Actor(tokens, callers);
        actors[userAddress] = _actor;
        (success,) = address(_actor).call{value: INITIAL_ETH_BALANCE}("");
        assert(success);
        actorAddress = address(_actor);
    }
}
