// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// BigBang Contracts
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {BBBorrow} from "contracts/markets/bigBang/BBBorrow.sol";
import {BBCollateral} from "contracts/markets/bigBang/BBCollateral.sol";
import {BBLeverage} from "contracts/markets/bigBang/BBLeverage.sol";
import {BBLiquidation} from "contracts/markets/bigBang/BBLiquidation.sol";

// Singularity Contracts
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {SGLBorrow} from "contracts/markets/singularity/SGLBorrow.sol";
import {SGLCollateral} from "contracts/markets/singularity/SGLCollateral.sol";
import {SGLLeverage} from "contracts/markets/singularity/SGLLeverage.sol";
import {SGLLiquidation} from "contracts/markets/singularity/SGLLiquidation.sol";

// Market Contracts
import {Market} from "contracts/markets/Market.sol";
import {MarketERC20} from "contracts/markets/MarketERC20.sol";
import {ExampleMarketLiquidatorReceiver} from "contracts/markets/ExampleMarketLiquidatorReceiver.sol";

// USDO Contracts
import {Usdo} from "contracts/usdo/Usdo.sol";
import {BaseUsdo} from "contracts/usdo/BaseUsdo.sol";
import {USDOFlashloanHelper} from "contracts/usdo/USDOFlashloanHelper.sol";
import {BaseUsdoTokenMsgType} from "contracts/usdo/BaseUsdoTokenMsgType.sol";

// Periph
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";
import {Pearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

// Protocol ontracts
import {Penrose} from "contracts/Penrose.sol";
import {Origins} from "contracts/markets/origins/Origins.sol";
import {AssetToSGLPLeverageExecutor} from "contracts/markets/leverage/AssetToSGLPLeverageExecutor.sol";
import {AssetTotsDaiLeverageExecutor} from "contracts/markets/leverage/AssetTotsDaiLeverageExecutor.sol";
import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";

// Utils
import {YieldBox} from "yieldbox/YieldBox.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {WETH9Mock} from "yieldbox/mocks/WETH9Mock.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";

// Mocks
import {ERC20Mock} from "test/ERC20Mock.sol";
import {OracleMock} from "test/OracleMock.sol";

// Interfaces
import {IBigBang} from "tapioca-periph/interfaces/bar/IBigBang.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";

// Utils
import {Actor} from "../utils/Actor.sol";

/// @notice BaseStorage contract for all test contracts, works in tandem with BaseTest
abstract contract BaseStorage {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       CONSTANTS                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    uint256 constant MAX_TOKEN_AMOUNT = 1e29;

    uint256 constant ONE_DAY = 1 days;
    uint256 constant ONE_MONTH = ONE_YEAR / 12;
    uint256 constant ONE_YEAR = 365 days;

    uint256 internal constant NUMBER_OF_ACTORS = 3;
    uint256 internal constant INITIAL_ETH_BALANCE = 1e26;
    uint256 internal constant INITIAL_COLL_BALANCE = 1e21;

    uint256 internal constant diff_tolerance = 0.000000000002e18; //compared to 1e18
    uint256 internal constant MAX_PRICE_CHANGE_PERCENT = 1.05e18; //compared to 1e18

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                          ACTORS                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Stores the actor during a handler call
    Actor internal actor;

    /// @notice Mapping of fuzzer user addresses to actors
    mapping(address => Actor) internal actors;

    /// @notice Array of all actor addresses
    address[] internal actorAddresses;

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       SUITE STORAGE                                       //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // BIG BANG CONTRACTS

    /// @notice BigBang market
    BigBang internal bigBang;

    /// @notice Modules for the BigBang contract
    BBLiquidation internal bbLiquidation;
    BBLeverage internal bbLeverage;
    BBCollateral internal bbCollateral;
    BBBorrow internal bbBorrow;

    // SINGULARITY CONTRACTS

    /// @notice Singularity market
    Singularity internal singularity;

    /// @notice Modules for the Singularity contract
    SGLLiquidation internal sglLiquidation;
    SGLLeverage internal sglLeverage;
    SGLCollateral internal sglCollateral;
    SGLBorrow internal sglBorrow;

    //TODO add USDO contracts

    // MARKET CONTRACTS

    /// @notice Contract that receives liquidations from the market
    ExampleMarketLiquidatorReceiver internal marketLiquidatorReceiver;
    /// @notice Registry contract for the markets
    Penrose internal penrose;
    /// @notice Oracle contract for the markets
    OracleMock internal oracle;

    // YIELDBOX CONTRACTS

    /// @notice YieldBox contract
    YieldBox internal yieldbox;
    /// @notice YieldBox URI Builder contract
    YieldBoxURIBuilder internal yieldboxURIBuilder;

    // PERIPH CONTRACTS

    MarketHelper internal marketHelper;

    /// @notice Cluster contract
    Cluster internal cluster;

    /// @notice Pearlmit permitc contract
    Pearlmit internal pearlmit;

    // MOCK CONTRACTS

    /// @notice WETH9 mock contract
    WETH9Mock internal weth9Mock;
    /// @notice ERC20 mock contract
    ERC20Mock internal erc20Mock;

    address[] internal baseAssets;

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                     EXTRA VARIABLES                                       //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Target market for the current setup
    address target;

    enum MarketType {BIGBANG, SINGULARITY}

    /// @notice Target market type for the current setup    
    MarketType targetType;
}
