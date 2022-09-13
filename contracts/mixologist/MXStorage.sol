// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../bar/YieldBox.sol';
import '../swappers/MultiSwapper.sol';
import '../mixologist/interfaces/IOracle.sol';
import '../mixologist/interfaces/IFlashLoan.sol';
import '../liquidationQueue/ILiquidationQueue.sol';

// solhint-disable max-line-length

contract MXStorage is BoringOwnable, ERC20 {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    
    
    // ************* //
    // *** ERC20 *** //
    // ************* //
    
    function symbol() external view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    'tm',
                    collateral.safeSymbol(),
                    '/',
                    asset.safeSymbol(),
                    '-',
                    oracle.symbol(oracleData)
                )
            );
    }

    function name() external view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    'Tapioca Mixologist ',
                    collateral.safeName(),
                    '/',
                    asset.safeName(),
                    '-',
                    oracle.name(oracleData)
                )
            );
    }

    function decimals() external view returns (uint8) {
        return asset.safeDecimals();
    }

    // totalSupply for ERC20 compatibility
    // BalanceOf[user] represent a fraction
    function totalSupply() public view override returns (uint256) {
        return totalAsset.base;
    }


    // ************ //
    // *** VARS *** //
    // ************ //
    struct AccrueInfo {
        uint64 interestPerSecond;
        uint64 lastAccrued;
        uint128 feesEarnedFraction;
    }

    AccrueInfo public accrueInfo;

    BeachBar public beachBar;
    YieldBox public yieldBox;
    ILiquidationQueue public liquidationQueue;
    IERC20 public collateral;
    IERC20 public asset;
    uint256 public collateralId;
    uint256 public assetId;

    // Total amounts
    uint256 public totalCollateralShare; // Total collateral supplied
    Rebase public totalAsset; // elastic = yieldBox shares held by the Mixologist, base = Total fractions held by asset suppliers
    Rebase public totalBorrow; // elastic = Total token amount to be repayed by borrowers, base = Total parts of the debt held by borrowers

    // User balances
    mapping(address => uint256) public userCollateralShare;
    // userAssetFraction is called balanceOf for ERC20 compatibility (it's in ERC20.sol)
    mapping(address => uint256) public userBorrowPart;
    // map of operator approval
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    /// Asset -> collateral = assetAmount * exchangeRate.
    uint256 public exchangeRate;

    IOracle oracle;
    bytes oracleData;
    address[] collateralSwapPath; // Collateral -> Asset
    address[] tapSwapPath; // Asset -> Tap

    //errors
    error NotApproved(address _from, address _operator);

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event LogExchangeRate(uint256 rate);
    event LogAccrue(
        uint256 accruedAmount,
        uint256 feeFraction,
        uint64 rate,
        uint256 utilization
    );
    event LogAddCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    event LogAddAsset(
        address indexed from,
        address indexed to,
        uint256 share,
        uint256 fraction
    );
    event LogRemoveCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    event LogRemoveAsset(
        address indexed from,
        address indexed to,
        uint256 share,
        uint256 fraction
    );
    event LogBorrow(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 feeAmount,
        uint256 part
    );
    event LogRepay(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 part
    );
    event LogWithdrawFees(address indexed feeTo, uint256 feesEarnedFraction);
    event LogFlashLoan(
        address indexed borrower,
        uint256 amount,
        uint256 feeAmount,
        address indexed receiver
    );
    event LogYieldBoxFeesDeposit(uint256 feeShares, uint256 tapAmount);
    event LogApprovalForAll(
        address indexed _from,
        address indexed _operator,
        bool _approved
    );
    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal constant CLOSED_COLLATERIZATION_RATE = 75000; // 75%
    uint256 internal constant LQ_COLLATERIZATION_RATE = 25000; // 25%
    uint256 internal constant COLLATERIZATION_RATE_PRECISION = 1e5; // Must be less than EXCHANGE_RATE_PRECISION (due to optimization in math)
    uint256 internal constant MINIMUM_TARGET_UTILIZATION = 7e17; // 70%
    uint256 internal constant MAXIMUM_TARGET_UTILIZATION = 8e17; // 80%
    uint256 internal constant UTILIZATION_PRECISION = 1e18;
    uint256 internal constant FULL_UTILIZATION = 1e18;
    uint256 internal constant FULL_UTILIZATION_MINUS_MAX =
        FULL_UTILIZATION - MAXIMUM_TARGET_UTILIZATION;
    uint256 internal constant FACTOR_PRECISION = 1e18;

    uint64 internal constant STARTING_INTEREST_PER_SECOND = 317097920; // approx 1% APR
    uint64 internal constant MINIMUM_INTEREST_PER_SECOND = 79274480; // approx 0.25% APR
    uint64 internal constant MAXIMUM_INTEREST_PER_SECOND = 317097920000; // approx 1000% APR
    uint256 internal constant INTEREST_ELASTICITY = 28800e36; // Half or double in 28800 seconds (8 hours) if linear

    uint256 internal constant EXCHANGE_RATE_PRECISION = 1e18;

    uint256 internal constant ORDER_BOOK_LIQUIDATION_MULTIPLIER = 127000; // add 27%
    uint256 internal constant LIQUIDATION_MULTIPLIER = 112000; // add 12%
    uint256 internal constant LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

    // Fees
    uint256 internal constant CALLER_FEE = 1000; // 1%
    uint256 internal constant CALLER_FEE_DIVISOR = 1e5;
    uint256 internal constant PROTOCOL_FEE = 10000; // 10%
    uint256 internal constant PROTOCOL_FEE_DIVISOR = 1e5;
    uint256 internal constant BORROW_OPENING_FEE = 50; // 0.05%
    uint256 internal constant BORROW_OPENING_FEE_PRECISION = 1e5;
    uint256 internal constant FLASHLOAN_FEE = 90; // 0.09%
    uint256 internal constant FLASHLOAN_FEE_PRECISION = 1e5;
}
