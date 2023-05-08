// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

import "tapioca-periph/contracts/interfaces/ISwapper.sol";
import "tapioca-periph/contracts/interfaces/IPenrose.sol";
import "tapioca-periph/contracts/interfaces/ISingularity.sol";
import "tapioca-periph/contracts/interfaces/ILiquidationQueue.sol";
import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";

import "../Market.sol";

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

contract SGLStorage is BoringOwnable, Market {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice information about the accrual info
    ISingularity.AccrueInfo public accrueInfo;
    /// @notice total assets share & amount
    Rebase public totalAsset; // elastic = yieldBox shares held by the Singularity, base = Total fractions held by asset suppliers
    /// @notice liquidation queue address
    ILiquidationQueue public liquidationQueue;

    // YieldBox shares, from -> Yb asset type -> shares
    mapping(address => mapping(bytes32 => uint256)) internal _yieldBoxShares;
    bytes32 internal ASSET_SIG =
        0x0bd4060688a1800ae986e4840aebc924bb40b5bf44de4583df2257220b54b77c; // keccak256("asset")
    bytes32 internal COLLATERAL_SIG =
        0x7d1dc38e60930664f8cbf495da6556ca091d2f92d6550877750c049864b18230; // keccak256("collateral")

    /// @notice borrowing opening fee
    uint256 public borrowOpeningFee = 50; //0.05%
    /// @notice liquidation multiplier used to compute liquidator rewards
    uint256 public liquidationMultiplier = 112000; //12%
    /// @notice order book liquidation multiplier used to compute liquidator rewards
    uint256 public orderBookLiquidationMultiplier = 127000; //27%
    /// @notice collateralization rate
    uint256 public lqCollateralizationRate = 25000; // 25%

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when accrual happens
    event LogAccrue(
        uint256 accruedAmount,
        uint256 feeFraction,
        uint64 rate,
        uint256 utilization
    );
    /// @notice event emitted when collateral is added
    event LogAddCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    /// @notice event emitted when asset is added
    event LogAddAsset(
        address indexed from,
        address indexed to,
        uint256 share,
        uint256 fraction
    );
    /// @notice event emitted when collateral is removed
    event LogRemoveCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    /// @notice event emitted when asset is removed
    event LogRemoveAsset(
        address indexed from,
        address indexed to,
        uint256 share,
        uint256 fraction
    );
    /// @notice event emitted when asset is borrowed
    event LogBorrow(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 feeAmount,
        uint256 part
    );
    /// @notice event emitted when asset is repayed
    event LogRepay(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 part
    );
    /// @notice event emitted when fees are extracted
    event LogWithdrawFees(address indexed feeTo, uint256 feesEarnedFraction);
    /// @notice event emitted when fees are deposited to YieldBox
    event LogYieldBoxFeesDeposit(uint256 feeShares, uint256 ethAmount);

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
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

    constructor() MarketERC20("Tapioca Singularity") {}

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns market's ERC20 symbol
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

    /// @notice returns market's ERC20 name
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

    /// @notice returns market's ERC20 decimals
    function decimals() external view returns (uint8) {
        return asset.safeDecimals();
    }

    /// @notice returns market's ERC20 totalSupply
    /// @dev totalSupply for ERC20 compatibility
    ///      BalanceOf[user] represent a fraction
    function totalSupply() public view override returns (uint256) {
        return totalAsset.base;
    }
}
