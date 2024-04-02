// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title InvariantsSpec
/// @notice Invariants specification for the protocol
/// @dev Contains pseudo code and description for the invariants in the protocol
/// @dev This is inherited in HooksBase in order to be used in postconditions and invariants files
abstract contract InvariantsSpec {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        COMMON                                             //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Accounting

    string constant COMMON_INVARIANT_A = "COMMON_INVARIANT_A: active user => totalCollateralShare > 0";

    string constant COMMON_INVARIANT_B = "COMMON_INVARIANT_B: totalBorrows.elastic != 0 => totalCollateralShare > 0";

    string constant COMMON_INVARIANT_B2 = "COMMON_INVARIANT_B2: userBorrowPart(user) != 0 => collateralShare(user) > 0";

    string constant COMMON_INVARIANT_C = "COMMON_INVARIANT_C: collateral.balanceOf(market) >= totalCollateralShare";

    /// @notice Protocol behaviour

    string constant COMMON_INVARIANT_D = "COMMON_INVARIANT_D: Add Tokens can never grant more results than what was added";//TODO

    string constant COMMON_INVARIANT_E = "COMMON_INVARIANT_E: update pause calls pauses the correct pause type";

    /// @notice Accrual mechanism

    string constant COMMON_INVARIANT_F = "COMMON_INVARIANT_F: _accrue should never revert";

    string constant COMMON_INVARIANT_J = "COMMON_INVARIANT_J: _accrueView should never revert";//TODO

    string constant COMMON_INVARIANT_K = "COMMON_INVARIANT_K: _accrueView should result in the same value as accrue";//TODO

    /// @notice Collateral

    string constant COMMON_INVARIANT_N = "COMMON_INVARIANT_N: addCollateral cannot decrease value";

    string constant COMMON_INVARIANT_O = "COMMON_INVARIANT_O: addCollateral increases totalCollateralShare by a specific amount";

    string constant COMMON_INVARIANT_O2 = "COMMON_INVARIANT_O2: addCollateral cannot add 0 shares";//@audit-issue breaks

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                         BIG BANG                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Parameter bounding

    string constant BIGBANG_INVARIANT_A = "BIGBANG_INVARIANT_A: minMintFeeStart <= maxMintFeeStart";

    string constant BIGBANG_INVARIANT_B = "BIGBANG_INVARIANT_B: minMintFee <= maxMintFee";

    string constant BIGBANG_INVARIANT_C = "BIGBANG_INVARIANT_C: minDebtRate <= maxDebtRate";

    string constant BIGBANG_INVARIANT_D = "BIGBANG_INVARIANT_D: debtRate is within bounds";

    string constant BIGBANG_INVARIANT_E = "BIGBANG_INVARIANT_E: getDebtRate should never revert";

    /// @notice Accounting

    string constant BIGBANG_INVARIANT_F = "BIGBANG_INVARIANT_F: usdo.totalSupply == elastic";

    /// @notice Repayment

    string constant BIGBANG_INVARIANT_G = "BIGBANG_INVARIANT_G: Repayments do not increase the total system debt";

    string constant BIGBANG_INVARIANT_H = "BIGBANG_INVARIANT_H: The total system value does not decrease during repayments";

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        SINGULARITY                                        //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Parameter bounding

    string constant SINGULARITY_INVARIANT_A = "SINGULARITY_INVARIANT_A: minimumTargetUtilization <= maximumTargetUtilization";

    string constant SINGULARITY_INVARIANT_B = "SINGULARITY_INVARIANT_B: utilisation should be whithin bounds";

    string constant SINGULARITY_INVARIANT_C = "SINGULARITY_INVARIANT_C: minimumInterestPerSecond <= maximumInterestPerSecond";

    string constant SINGULARITY_INVARIANT_D = "SINGULARITY_INVARIANT_D: interestPerSecond should be within bounds";

    /// @notice Assets management

    string constant SINGULARITY_INVARIANT_E = "SINGULARITY_INVARIANT_E: sum(balanceOf(users)) == totalAsset.base";

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                          MARKET                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Parameter bounding

    string constant MARKET_INVARIANT_A = "MARKET_INVARIANT_A: protocol fee is less than to fee precision";

    string constant MARKET_INVARIANT_B = "MARKET_INVARIANT_B: min liquidator reward is less than to max liquidator reward";

    string constant MARKET_INVARIANT_C = "MARKET_INVARIANT_C: min liquidator reward is less than to liquidator reward";

    /// @notice Accrual mechanism

    string constant MARKET_INVARIANT_E = "MARKET_INVARIANT_E: lastAccruedTimestamp <= block.timestamp";

    string constant MARKET_INVARIANT_F = "MARKET_INVARIANT_F: lastAccruedTimestamp increases monotonically";

    //string constant MARKET_INVARIANT_F = "MARKET_INVARIANT_F: action reverts if oracle price is invalid & rate is too old";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                            REBASE                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Borrowing

    string constant RB_INVARIANT_A = "RB_INVARIANT_A: When elastic is 0, base is equal to 0";

    string constant RB_INVARIANT_B = "RB_INVARIANT_B: Elastic >= base";

    string constant RB_INVARIANT_C = "RB_INVARIANT_C: Elastic <= totalBorrowCap";

    string constant RB_INVARIANT_D = "RB_INVARIANT_D: Ratio elastic / base monotonically increases";

    /// @notice Singularity Asset

    string constant RB_INVARIANT_E = "RB_INVARIANT_E: When elastic is 0, base is equal to 0";

    string constant RB_INVARIANT_F = "RB_INVARIANT_F: Elastic >= base";

    string constant RB_INVARIANT_G = "RB_INVARIANT_G: Ratio elastic / base monotonically increases";

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        BORROWING                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Borrowing Accounting

    string constant BORROWING_INVARIANT_A = "BORROWING_INVARIANT_A: ghost_totalBorrowBase == totalBorrow.base";

    string constant BORROWING_INVARIANT_B = "BORROWING_INVARIANT_B: sum(ghost_userBorrowPart) == ghost_totalBorrowBase";



    string constant BORROWING_INVARIANT_D = "BORROWING_INVARIANT_D: sum(userBorrowPart) == base";

    string constant BORROWING_INVARIANT_E = "BORROWING_INVARIANT_E: sum(userDebt) == elastic";//@audit-issue breaks but under tolerance of NUM_ACTORS wei

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                         LENDING                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant LENDING_INVARIANT_A = "LENDING_INVARIANT_A: Given an amount, user can only receive a specific number of shares";

    string constant LENDING_INVARIANT_B = "LENDING_INVARIANT_B: Given shares, user can only receive a specific amount";

    string constant LENDING_INVARIANT_C = "LENDING_INVARIANT_C: removeCollateral decreases totalCollateralShare by a specific amount"; 

    string constant LENDING_INVARIANT_C2 = "LENDING_INVARIANT_C2: removeCollateral can never remove 0 shares"; 

    /// @notice Collateral

    string constant LENDING_INVARIANT_D = "LENDING_INVARIANT_D: sum(userCollateralShare) == totalCollateralShare";

    string constant LENDING_INVARIANT_F = "LENDING_INVARIANT_F: addCollateral & removeCollateral are inverse operations";

    string constant LENDING_INVARIANT_H = "LENDING_INVARIANT_H: ghost_totalCollateralShare == totalCollateralShare";

    string constant LENDING_INVARIANT_I = "LENDING_INVARIANT_I: sum(ghost_userCollateralShare) == ghost_totalCollateralShare";

    /// @notice Assets

    string constant LENDING_INVARIANT_G = "LENDING_INVARIANT_G: addAsset & removeAsset are inverse operations";

    string constant LENDING_INVARIANT_J = "LENDING_INVARIANT_J: ghost_totalAssetBase == totalAsset.base";

    string constant LENDING_INVARIANT_K = "LENDING_INVARIANT_K: sum(ghost_userAssetBase) == ghost_totalAssetBase";

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        LEVERAGE                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant LEVERAGE_INVARIANT_A = "LEVERAGE_INVARIANT_A: Leverage functions cannot self liquidate, inflate debt or over-borrow";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       LIQUIDATIONS                                        //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant LIQUIDATION_INVARIANT_A = "LIQUIDATION_INVARIANT_A: Liquidations always work when profitable (no reverts)";//TODO

    string constant LIQUIDATION_INVARIANT_B = "LIQUIDATION_INVARIANT_B: Liquidations never work when an account is not liquidatable";//TODO

    string constant LIQUIDATION_INVARIANT_C = "LIQUIDATION_INVARIANT_C: Liquidations Math is Sound";//TODO

    string constant LIQUIDATION_INVARIANT_D = "LIQUIDATION_INVARIANT_D: % value of part does not change after liquidation";//TODO

    string constant LIQUIDATION_INVARIANT_E = "LIQUIDATION_INVARIANT_E: Liquidations work when the oracle doesn't";//TODO //@audit not sure

    string constant LIQUIDATION_INVARIANT_F = "LIQUIDATION_INVARIANT_F: Liquidations can be performed with a lower premium and always work";//TODO

    string constant LIQUIDATION_INVARIANT_G = "LIQUIDATION_INVARIANT_G: Bad debt liquidations make the system health increase";//TODO

    string constant LIQUIDATION_INVARIANT_H = "LIQUIDATION_INVARIANT_H: Swap collateral cannot be used to game the system";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                            GLOBAL                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant GLOBAL_INVARIANT_A = "GLOBAL_INVARIANT_A: Any transaction to a paused function wont succeed";
}