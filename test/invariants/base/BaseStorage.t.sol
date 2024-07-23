// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// BigBang Contracts
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {BigBangExtended} from "test/invariants/helpers/extended/BigBangExtended.sol";
import {BBBorrow} from "contracts/markets/bigBang/BBBorrow.sol";
import {BBCollateral} from "contracts/markets/bigBang/BBCollateral.sol";
import {BBLeverage} from "contracts/markets/bigBang/BBLeverage.sol";
import {BBLiquidation} from "contracts/markets/bigBang/BBLiquidation.sol";

// Singularity Contracts
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {SingularityExtended} from "test/invariants/helpers/extended/SingularityExtended.sol";
import {SGLBorrow} from "contracts/markets/singularity/SGLBorrow.sol";
import {SGLCollateral} from "contracts/markets/singularity/SGLCollateral.sol";
import {SGLLeverage} from "contracts/markets/singularity/SGLLeverage.sol";
import {SGLLiquidation} from "contracts/markets/singularity/SGLLiquidation.sol";

// Market Contracts
import {Market} from "contracts/markets/Market.sol";
import {MarketERC20} from "contracts/markets/MarketERC20.sol";
import {MarketLiquidationReceiverMock} from "test/invariants/mocks/MarketLiquidationReceiverMock.sol";
import {SwapperMock} from "test/invariants/mocks/SwapperMock.sol";

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
import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";

// Utils
import {YieldBox} from "yieldbox/YieldBox.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {Actor} from "../utils/Actor.sol";
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";

// Mocks
import {ERC20Mock} from "test/mocks/ERC20Mock.sol";
import {OracleMock} from "test/mocks/OracleMock.sol";
import {TwTwapMock} from "mocks/TwTapMock.sol";

// Interfaces
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";

/// @notice BaseStorage contract for all test contracts, works in tandem with BaseTest
abstract contract BaseStorage {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       CONSTANTS                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    uint256 constant MAX_TOKEN_AMOUNT = 1e29;

    uint256 constant ONE_DAY = 1 days;
    uint256 constant ONE_MONTH = ONE_YEAR / 12;
    uint256 constant ONE_YEAR = 365 days;

    uint256 constant BASE_POINTS = 1e5;

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

    /// @notice Liquidator simulator contract
    Actor liquidator;

    /// @notice Contract that receives liquidations from the market
    IMarketLiquidatorReceiver internal marketLiquidatorReceiver;

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       SUITE STORAGE                                       //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // BIG BANG CONTRACTS

    /// @notice BigBang market
    BigBangExtended internal bigBang;

    /// @notice Modules for the BigBang contract
    BBLiquidation internal bbLiquidation;
    BBLeverage internal bbLeverage;
    BBCollateral internal bbCollateral;
    BBBorrow internal bbBorrow;

    // SINGULARITY CONTRACTS

    /// @notice Singularity market
    SingularityExtended internal singularity;

    /// @notice Modules for the Singularity contract
    SGLLiquidation internal sglLiquidation;
    SGLLeverage internal sglLeverage;
    SGLCollateral internal sglCollateral;
    SGLBorrow internal sglBorrow;

    // MARKET CONTRACTS

    /// @notice Registry contract for the markets
    Penrose internal penrose;

    // ORACLE CONTRACTS

    /// @notice Oracle contract for the market asset
    OracleMock internal oracle;
    /// @notice Oracle contract for USDO
    OracleMock internal assetOracle;

    // LEVERAGE EXECUTOR CONTRACTS

    SimpleLeverageExecutor internal simpleLeverageExecutor;

    // YIELDBOX CONTRACTS

    /// @notice YieldBox contract
    YieldBox internal yieldbox;
    /// @notice YieldBox URI Builder contract
    YieldBoxURIBuilder internal yieldboxURIBuilder;

    /// @notice mpaping from asset to yieldbox assetId
    mapping(address => uint256) internal assetIds;
    /// @notice array of yieldbox assets
    address[] internal yieldboxAssets;

    // PERIPH CONTRACTS

    MarketHelper internal marketHelper;

    /// @notice Cluster contract
    Cluster internal cluster;

    /// @notice Pearlmit permitc contract
    Pearlmit internal pearlmit;

    // MOCK CONTRACTS

    /// @notice WETH9 mock contract
    ERC20Mock internal weth9Mock;
    /// @notice ERC20 mock contract
    ERC20Mock internal erc20Mock;
    /// @notice TAP token mock contract
    ERC20Mock internal tapToken;
    /// @notice USDO token mock contract
    ERC20Mock internal usdo;

    /// @notice Swapper contract mock
    SwapperMock internal swapperMock;

    /// @notice twTAP mock contract
    TwTwapMock internal twTap;

    address[] internal baseAssets;

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                     EXTRA VARIABLES                                       //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Target market for the current setup
    ITarget targetContract;

    address target;

    enum MarketType {BIGBANG, SINGULARITY}

    /// @notice Target market type for the current setup    
    MarketType targetType;

    struct SToftInfo {
        bool isTokenInToft;
        bool isTokenOutToft;
    }

    struct SLeverageSwapData {
        uint256 minAmountOut;
        SToftInfo toftInfo;
        bytes swapperData;
    }
}

/// @notice Helper interface for the accrueInfo function 
interface ITarget {
    function accrueInfo() external view returns (uint64, uint64);

    function _asset() external view returns (address);

    function _collateral() external view returns (address);

    function _totalBorrow() external view returns (Rebase memory);

    function executeExtended(Module[] memory modules, bytes[] memory calls, bool) external;

    function accrueView() external view returns (Rebase memory);
}
