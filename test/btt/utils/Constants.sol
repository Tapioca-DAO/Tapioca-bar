// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/// @notice Helper contract containing constants for testing.
abstract contract Constants {
    // *************** //
    // *** GENERIC *** //
    // *************** //
    uint256 public constant SMALL_AMOUNT = 10 ether;
    uint256 public constant MEDIUM_AMOUNT = 100 ether;
    uint256 public constant LARGE_AMOUNT = 1000 ether;

    uint256 public constant USER_A_PKEY = 0x1;
    uint256 public constant USER_B_PKEY = 0x2;
    uint256 public constant USER_C_PKEY = 0x3;

    address public constant ADDRESS_ZERO = address(0);
    uint256 public constant VALUE_ZERO = 0;

    uint256 public constant MAX_ITERATIONS = 10;

    // **************** //
    // *** PEARLMIT *** //
    // **************** //
    /// @dev Constant value representing the ERC721 token type for signatures and transfer hooks
    uint256 constant TOKEN_TYPE_ERC721 = 721;
    /// @dev Constant value representing the ERC1155 token type for signatures and transfer hooks
    uint256 constant TOKEN_TYPE_ERC1155 = 1155;
    /// @dev Constant value representing the ERC20 token type for signatures and transfer hooks
    uint256 constant TOKEN_TYPE_ERC20 = 20;

    // *************** //
    // *** MARKETS *** //
    // *************** //

    // CR
    uint256 public constant COLLATERALIZATION_RATE = 75000;
    uint256 public constant LIQUIDATION_COLLATERALIZATION_RATE = 80000;

    uint256 public constant DEFAULT_EXCHANGE_RATE = 1 ether;

    // Penrose
    uint256 public constant DEFAULT_PENROSE_DEBT_RATE = 0.5 ether;

    // BB debt rates
    uint256 public constant BB_DEBT_RATE_AGAINST_MAIN_MARKET = 0.2 ether;
    uint256 public constant BB_MIN_DEBT_RATE = 0.005 ether;
    uint256 public constant BB_MAX_DEBT_RATE = 0.05 ether;

    // BB default values
    uint256 public constant PROTOCOL_FEE = 10000;
    uint256 public constant MIN_LIQUIDATOR_REWARD = 88e3;
    uint256 public constant MAX_LIQUIDATOR_REWARD = 925e2;
    uint256 public constant LIQUIDATION_BONUS_AMOUNT = 3e3;
    uint256 public constant LIQUIDATION_MULTIPLIER = 12000;
    uint256 public constant RATE_VALID_DURATION = 24 hours;
    uint256 public constant MAX_MINT_FEE = 1000;
    uint256 public constant MAX_MINT_FEE_START = 980000000000000000;
    uint256 public constant MIN_MINT_FEE_START = 1000000000000000000;
    uint256 public constant MIN_BORROW_AMOUNT = 1e15;
    uint256 public constant MIN_COLLATERAL_AMOUNT = 1e15;
    uint256 public constant FEE_PRECISION = 1e5;
    uint256 public constant MIN_LIQUIDATION_BONUS = 1e5;

    // SGL default values
    uint256 public constant CR_RATE = 75000;
    uint256 public constant LQ_CR_RATE = 80000;


    // ************ //
    // *** USDO *** //
    // ************ //
    uint16 public constant SEND = 1; // Send LZ message type
    uint16 public constant PT_APPROVALS = 500; // Use for ERC20Permit approvals
    uint16 public constant PT_YB_APPROVE_ASSET = 503; // Use for YieldBox 'setApprovalForAsset(true)' operation
    uint16 public constant PT_YB_APPROVE_ALL = 504; // Use for YieldBox 'setApprovalForAll(true)' operation
    uint16 public constant PT_MARKET_PERMIT = 505; // Use for market.permitLend() operation
    uint16 public constant PT_REMOTE_TRANSFER = 700; // Use for transferring tokens from the contract from another chain
    uint16 public constant PT_MARKET_REMOVE_ASSET = 900; // Use for remove asset from a market available on another chain
    uint16 public constant PT_YB_SEND_SGL_LEND_OR_REPAY = 901; // Use to YB deposit, lend/repay on a market available on another chain
    uint16 public constant PT_TAP_EXERCISE = 902; // Use for exercise options on tOB available on another chain
}
