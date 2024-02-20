// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IBigBang} from "tapioca-periph/interfaces/bar/IBigBang.sol";
import {MarketERC20, Market} from "../Market.sol";

// solhint-disable max-line-length

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract BBStorage is Ownable, Market, ReentrancyGuard {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    using SafeCast for uint256;

    // ************ //
    // *** VARS *** //
    // ************ //

    IBigBang.AccrueInfo public accrueInfo;

    bool public isMainMarket;
    uint256 public maxDebtRate;
    uint256 public minDebtRate;
    uint256 public debtRateAgainstEthMarket;

    ITapiocaOracle public assetOracle; //USDO/USDC
    bytes public assetOracleData;
    uint256 public minMintFee = 0;
    uint256 public maxMintFee = 1000;

    uint256 public maxMintFeeStart;
    uint256 public minMintFeeStart;

    uint256 internal constant DEBT_PRECISION = 1e18;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when accrue is called
    event LogAccrue(uint256 indexed accruedAmount, uint64 indexed rate);
    /// @notice event emitted when collateral is added
    event LogAddCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when collateral is removed
    event LogRemoveCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when borrow is performed
    event LogBorrow(address indexed from, address indexed to, uint256 indexed amount, uint256 feeAmount, uint256 part);
    /// @notice event emitted when a repay operation is performed
    event LogRepay(address indexed from, address indexed to, uint256 indexed amount, uint256 part);
    /// @notice event emitted when the minimum debt rate is updated
    event MinDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the maximum debt rate is updated
    event MaxDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the debt rate against the main market is updated
    event DebtRateAgainstEthUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the asset's Oracle is updated
    event AssetOracleUpdated(address indexed oldVal, address indexed newVal);
    /// @notice event emitted when the asset's Oracle data is updated
    event AssetOracleDataUpdated();
    /// @notice event emitted when min and max mint fees are updated
    event UpdateMinMaxMintFee(uint256 indexed oldMin, uint256 indexed newMin, uint256 indexed oldMax, uint256 newMax);
    /// @notice event emitted when min and max mint range values are updated
    event UpdateMinMaxMintRange(uint256 indexed oldMin, uint256 indexed newMin, uint256 indexed oldMax, uint256 newMax);

    constructor() MarketERC20("Tapioca BigBang") {}

    function _accrue() internal virtual override {}

    function _accrueView() internal view virtual override returns (Rebase memory) {}
}
