// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

import "./interfaces/ISingularity.sol";
import "../swappers/ISwapper.sol";
import "../liquidationQueue/ILiquidationQueue.sol";
import "../interfaces/IPenrose.sol";
import "../interfaces/IOracle.sol";
import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";

// solhint-disable max-line-length

/*

__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__

*/

contract SGLStorage is BoringOwnable, ERC20 {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //

    ISingularity.AccrueInfo public accrueInfo;

    IPenrose public penrose;
    YieldBox public yieldBox;
    ILiquidationQueue public liquidationQueue;
    IERC20 public collateral;
    IERC20 public asset;
    uint256 public collateralId;
    uint256 public assetId;
    bool public paused;
    address public conservator;

    // Total amounts
    uint256 public totalCollateralShare; // Total collateral supplied
    Rebase public totalAsset; // elastic = yieldBox shares held by the Singularity, base = Total fractions held by asset suppliers
    Rebase public totalBorrow; // elastic = Total token amount to be repayed by borrowers, base = Total parts of the debt held by borrowers
    uint256 public totalBorrowCap;
    mapping(address => mapping(uint256 => uint256)) internal _yieldBoxShares;

    // User balances
    mapping(address => uint256) public userCollateralShare;
    // userAssetFraction is called balanceOf for ERC20 compatibility (it's in ERC20.sol)
    mapping(address => uint256) public userBorrowPart;

    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    /// Asset -> collateral = assetAmount * exchangeRate.
    uint256 public exchangeRate;

    IOracle public oracle;
    bytes public oracleData;

    // Fees
    uint256 public callerFee = 1000; //1%
    uint256 public protocolFee = 10000; //10%
    uint256 public borrowOpeningFee = 50; //0.05%

    //Liquidation
    uint256 public liquidationMultiplier = 112000; //12%
    uint256 public orderBookLiquidationMultiplier = 127000; //27%

    uint256 public closedCollateralizationRate = 75000; // 75%
    uint256 public lqCollateralizationRate = 25000; // 25%

    uint256 public minLiquidatorReward = 1e3; //1%
    uint256 public maxLiquidatorReward = 1e4; //10%
    uint256 public liquidationBonusAmount = 1e4; //10%

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
    event LogYieldBoxFeesDeposit(uint256 feeShares, uint256 ethAmount);
    event LogApprovalForAll(
        address indexed _from,
        address indexed _operator,
        bool _approved
    );
    event LogBorrowCapUpdated(uint256 _oldVal, uint256 _newVal);
    event PausedUpdated(bool oldState, bool newState);
    event ConservatorUpdated(address indexed old, address indexed _new);

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal constant COLLATERALIZATION_RATE_PRECISION = 1e5; // Must be less than EXCHANGE_RATE_PRECISION (due to optimization in math)

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

    uint256 internal EXCHANGE_RATE_PRECISION = 1e18; //mutable but can only be set in the init method
    uint256 internal constant LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

    // Fees
    uint256 internal constant FEE_PRECISION = 1e5;

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    function symbol() public view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "tm",
                    collateral.safeSymbol(),
                    "/",
                    asset.safeSymbol(),
                    "-",
                    oracle.symbol(oracleData)
                )
            );
    }

    function name() external view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "Tapioca Singularity ",
                    collateral.safeName(),
                    "/",
                    asset.safeName(),
                    "-",
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
}
