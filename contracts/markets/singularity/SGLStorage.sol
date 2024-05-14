// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {Market, MarketERC20} from "../Market.sol";

// solhint-disable max-line-length

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGLStorage is Ownable, Market, ReentrancyGuard {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    using SafeCast for uint256;

    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice information about the accrual info
    ISingularity.AccrueInfo public accrueInfo;
    /// @notice total assets share & amount
    Rebase public totalAsset; // elastic = yieldBox shares held by the Singularity, base = Total fractions held by asset suppliers

    uint256 public minimumTargetUtilization;
    uint256 public maximumTargetUtilization;

    uint64 public minimumInterestPerSecond;
    uint64 public maximumInterestPerSecond;
    uint256 public interestElasticity;
    uint64 public startingInterestPerSecond;

    /// @notice borrowing opening fee
    uint256 public borrowOpeningFee = 50; //0.05%

    address public interestHelper;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when borrow opening fee is updated
    event LogBorrowingFee(uint256 indexed _oldVal, uint256 indexed _newVal);
    /// @notice event emitted when accrual happens
    event LogAccrue(
        uint256 indexed accruedAmount, uint256 indexed feeFraction, uint64 indexed rate, uint256 utilization
    );
    /// @notice event emitted when collateral is added
    event LogAddCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when asset is added
    event LogAddAsset(address indexed from, address indexed to, uint256 indexed share, uint256 fraction);
    /// @notice event emitted when collateral is removed
    event LogRemoveCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when asset is removed
    event LogRemoveAsset(address indexed from, address indexed to, uint256 indexed share, uint256 fraction);
    /// @notice event emitted when asset is borrowed
    event LogBorrow(address indexed from, address indexed to, uint256 indexed amount, uint256 feeAmount, uint256 part);
    /// @notice event emitted when asset is repayed
    event LogRepay(address indexed from, address indexed to, uint256 indexed amount, uint256 part);
    /// @notice event emitted when fees are extracted
    event LogWithdrawFees(address indexed feeTo, uint256 indexed feesEarnedFraction);
    /// @notice event emitted when the minimum target utilization is updated
    event MinimumTargetUtilizationUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the maximum target utilization is updated
    event MaximumTargetUtilizationUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the minimum interest per second is updated
    event MinimumInterestPerSecondUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the maximum interest per second is updated
    event MaximumInterestPerSecondUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the interest elasticity updated
    event InterestElasticityUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the interest helper is updated
    event InterestHelperUpdated(address indexed oldVal, address indexed newVal);

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal constant FULL_UTILIZATION = 1e18;
    uint256 internal constant UTILIZATION_PRECISION = 1e18;
    constructor() MarketERC20("Tapioca Singularity") {}

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns market's ERC20 symbol
    function symbol() external view returns (string memory) {
        return string(abi.encodePacked("tm-", collateral.safeSymbol()));
    }

    /// @notice returns market's ERC20 name
    function name() external view returns (string memory) {
        return string(abi.encodePacked("Tapioca Singularity-", collateral.safeName()));
    }

    /// @notice returns market's ERC20 decimals
    function decimals() external view returns (uint8) {
        return asset.safeDecimals();
    }

    /// @notice returns market's ERC20 totalSupply
    /// @dev totalSupply for ERC20 compatibility
    ///      BalanceOf[user] represent a fraction
    function totalSupply() public view virtual override returns (uint256) {
        return totalAsset.base;
    }

    function _accrue() internal virtual override {}

    function _accrueView() internal view virtual override returns (Rebase memory) {}
}
