// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import { 
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
    MarketHelper,
    MarketLiquidationReceiverMock
    } from "./base/BaseStorage.t.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";

// Test Contracts
import {Actor, LiquidatorActor} from "./utils/Actor.sol";
import {BaseTest} from "./base/BaseTest.t.sol";
import {OracleMock} from "test/OracleMock.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {SwapperMock} from "test/SwapperMock.sol";

// Interfaces
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {
    ERC20WithoutStrategy, IStrategy, IYieldBox as IBoringYieldBox
} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";

import "forge-std/console.sol";

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
        // Oracle Mock USD0/USD
        usdoOracle = new OracleMock("USDO/USD Oracle", "USDCOracle", 1 ether);

        // Deploy Tokens
        weth9Mock = new ERC20Mock('WETH Mock', 'WETH');
        erc20Mock = new ERC20Mock('USDC Mock', 'USDC');

        tapToken = new ERC20Mock("TAP Token", "TAP");
        usdo = new ERC20Mock("USDO", "USDO");

        baseAssets.push(address(weth9Mock));
        baseAssets.push(address(erc20Mock));

        // Deploy periphery

        //Deploy permit
        pearlmit = new Pearlmit("Pearlmit", "1");
        
        // Deploy Yieldbox
        yieldboxURIBuilder = new YieldBoxURIBuilder();
        yieldbox = new YieldBox(IWrappedNative(address(0)), yieldboxURIBuilder);

        // Setup Yieldbox assets
        ERC20WithoutStrategy _strategy = new ERC20WithoutStrategy(IYieldBox(address(yieldbox)), IERC20(address(erc20Mock)));
        assetIds[address(erc20Mock)] = yieldbox.registerAsset(TokenType.ERC20, address(erc20Mock), IStrategy(address(_strategy)), 0);
        yieldboxAssets.push(address(erc20Mock));

        // Deploy Cluster
        cluster = new Cluster(1, address(this));
        cluster.updateContract(0, address(this), true);

        // Deploy MarketHelper
        marketHelper = new MarketHelper();

        // Deploy Penrose
        penrose = new Penrose(
            IYieldBox(address(yieldbox)),
            ICluster(address(cluster)),
            IERC20(address(tapToken)),
            IERC20(address(weth9Mock)),
            IPearlmit(address(pearlmit)),
            address(this)
        );
        penrose.setUsdoToken(address(usdo));
        IStrategy _strategyUsdo = penrose.emptyStrategies(address(usdo));
        assetIds[address(usdo)] = yieldbox.ids(TokenType.ERC20, address(usdo), _strategyUsdo, 0);
        yieldboxAssets.push(address(usdo));
    }

    function _deployBigBang() internal {
        BigBang _mc = new BigBang();
        penrose.registerBigBangMasterContract(address(_mc), IPenrose.ContractType.mediumRisk);

        // Deploy BigBang modules
        bbCollateral = new BBCollateral();
        bbBorrow = new BBBorrow();
        bbLiquidation = new BBLiquidation();
        bbLeverage = new BBLeverage();

        swapperMock = new SwapperMock(yieldbox);
        
        // Deploy leverage executor
        simpleLeverageExecutor = new SimpleLeverageExecutor(IZeroXSwapper(address(swapperMock)), ICluster(address(cluster)));

        // Deploy BigBang market
        bigBang = new BigBang();

        // Initialize the BigBang market
        BigBang._InitMemoryModulesData memory _memoryModulesData = BigBang._InitMemoryModulesData({
            _liquidationModule: address(bbLiquidation),
            _borrowModule: address(bbBorrow),
            _collateralModule: address(bbCollateral),
            _leverageModule: address(bbLeverage)
        });

        BigBang._InitMemoryDebtData memory _memoryDebtData =  BigBang._InitMemoryDebtData({
            _debtRateAgainstEth: uint256(0),
            _debtRateMin: uint256(0),
            _debtRateMax: uint256(0)
        });

        BigBang._InitMemoryData memory _memoryData =  BigBang._InitMemoryData({
            _penrose: IPenrose(address(penrose)),
            _collateral: IERC20(address(erc20Mock)),
            _collateralId: assetIds[address(erc20Mock)],
            _oracle: ITapiocaOracle(address(oracle)),
            _exchangeRatePrecision: uint256(0),
            _collateralizationRate: uint256(0),
            _liquidationCollateralizationRate: uint256(0),
            _leverageExecutor: ILeverageExecutor(address(simpleLeverageExecutor))
        });

        bytes memory _bbData = abi.encode(
            _memoryModulesData, 
            _memoryDebtData, 
            _memoryData
        );

        bigBang.setAssetOracle(address(usdoOracle), "");

        bigBang.init(_bbData);

        // Set USDO oracle

        // Register BigBang in Penrose
        penrose.addBigBang(address(_mc), address(bigBang));

        penrose.setBigBangEthMarket(address(bigBang));

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

        swapperMock = new SwapperMock(yieldbox);
        
        // Deploy leverage executor
        simpleLeverageExecutor = new SimpleLeverageExecutor(IZeroXSwapper(address(swapperMock)), ICluster(address(cluster)));

        // Setup Yieldbox assets
        ERC20WithoutStrategy _strategy = new ERC20WithoutStrategy(IYieldBox(address(yieldbox)), IERC20(address(weth9Mock)));
        assetIds[address(weth9Mock)] = yieldbox.registerAsset(TokenType.ERC20, address(weth9Mock), IStrategy(address(_strategy)), 0);
        yieldboxAssets.push(address(weth9Mock));

        // Deploy Singularity market
        singularity = new Singularity();

        // Initialize the Singularity market
        Singularity._InitMemoryModulesData memory modulesData = Singularity._InitMemoryModulesData(
            address(sglLiquidation), address(sglBorrow), address(sglCollateral), address(sglLeverage)
        );

        Singularity._InitMemoryTokensData memory tokensData = Singularity._InitMemoryTokensData(
            IERC20(address(weth9Mock)), assetIds[address(weth9Mock)], IERC20(address(erc20Mock)), assetIds[address(erc20Mock)]
        );

        Singularity._InitMemoryData memory data = Singularity._InitMemoryData(
            IPenrose(address(penrose)), ITapiocaOracle(address(oracle)), uint256(0), uint256(0), uint256(0), ILeverageExecutor(address(simpleLeverageExecutor))
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

        address[] memory tokens = new address[](2);
        tokens[0] = address(erc20Mock);
        tokens[1] = address(weth9Mock);

        address[] memory _contracts = new address[](1);
        _contracts[0] = address(yieldbox);

        for (uint256 i = 0; i < NUMBER_OF_ACTORS; i++) {
            // Deply actor proxies and approve system contracts
            address _actor = _setUpActor(addresses[i], tokens, _contracts);

            // Mint initial balances to actors
            for (uint256 j; j < tokens.length; j++) {
                ERC20Mock _token = ERC20Mock(tokens[j]);
                _token.mint(_actor, INITIAL_BALANCE);
            }
            actorAddresses.push(_actor);
        }
        // Set the liquidator actor
        _setUpLiquidator(tokens, _contracts);
    }

    function _setUpActor(
        address userAddress,
        address[] memory tokens,
        address[] memory callers
    ) internal returns (address actorAddress) {
        bool success;
        Actor _actor = new Actor(tokens, callers, address(yieldbox), address(target));
        actors[userAddress] = _actor;
        (success,) = address(_actor).call{value: INITIAL_ETH_BALANCE}("");
        assert(success);
        actorAddress = address(_actor);
    }

    function _setUpLiquidator(
        address[] memory tokens,
        address[] memory callers
    ) internal {
        bool success;
        // Deploy liquidator actor
        LiquidatorActor _actor = new LiquidatorActor(address(usdo), address(erc20Mock), address(swapperMock), tokens, callers, address(yieldbox), address(target));
        marketLiquidatorReceiver = IMarketLiquidatorReceiver(_actor.marketLiquidatorReceiver());

        // Store liquidator actor
        address payable liquidatorAddress = payable(address(_actor));
        liquidator = Actor(liquidatorAddress);

        // Mint liquidity to the liquidator
        (success,) = liquidatorAddress.call{value: INITIAL_ETH_BALANCE}("");
        assert(success);
        for (uint256 j; j < tokens.length; j++) {
            ERC20Mock _token = ERC20Mock(tokens[j]);
            _token.mint(liquidatorAddress, INITIAL_BALANCE);
        }
    }
}
