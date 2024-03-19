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

    string constant COMMON_INVARIANT_A = "COMMON_INVARIANT_A: Value of basket changes properly";//TODO

    string constant COMMON_INVARIANT_B = "COMMON_INVARIANT_B: Rounding of values don't cause basket value to not change";//TODO

    string constant COMMON_INVARIANT_C = "COMMON_INVARIANT_C: balanceOf(market) >= totalCollateralShare(market)";

    string constant COMMON_INVARIANT_D = "COMMON_INVARIANT_D: Add Tokens can never grant more results than what was added";//TODO


    string constant COMMON_INVARIANT_J = "COMMON_INVARIANT_J: _accrueView should never revert";//TODO

    string constant COMMON_INVARIANT_K = "COMMON_INVARIANT_K: _accrueView should result in the same value as accrue";//TODO

    string constant COMMON_INVARIANT_L = "COMMON_INVARIANT_L: _accrue should never revert";//TODO

    string constant COMMON_INVARIANT_M = "COMMON_INVARIANT_M: Accrue Math should be sound";//TODO

    string constant COMMON_INVARIANT_N = "COMMON_INVARIANT_N: Accrue Math should never underflow";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                         BIG BANG                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant BIGBANG_INVARIANT_A = "BIGBANG_INVARIANT_A: minMintFeeStart <= maxMintFeeStart";//TODO

    string constant BIGBANG_INVARIANT_B = "BIGBANG_INVARIANT_B: minMintFee <= maxMintFee";//TODO

    string constant BIGBANG_INVARIANT_C = "BIGBANG_INVARIANT_C: minDebtRate <= maxDebtRate";//TODO

    string constant BIGBANG_INVARIANT_D = "BIGBANG_INVARIANT_D: debtRate is within bounds";//TODO

    string constant BIGBANG_INVARIANT_E = "BIGBANG_INVARIANT_E: getDebtRate should never revert";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        SINGULARITY                                        //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant SINGULARITY_INVARIANT_A = "SINGULARITY_INVARIANT_A: minimumTargetUtilization <= maximumTargetUtilization";//TODO

    string constant SINGULARITY_INVARIANT_B = "SINGULARITY_INVARIANT_B: utilisation should be whithin bounds";//TODO

    string constant SINGULARITY_INVARIANT_C = "SINGULARITY_INVARIANT_C: minimumInterestPerSecond <= maximumInterestPerSecond";//TODO

    string constant SINGULARITY_INVARIANT_D = "SINGULARITY_INVARIANT_D: interestPerSecond should be within bounds";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                          MARKET                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant MARKET_INVARIANT_A = "MARKET_INVARIANT_A: protocol fee is less than to fee precision";//TODO

    string constant MARKET_INVARIANT_B = "MARKET_INVARIANT_B: min liquidator reward is less than to max liquidator reward";//TODO

    string constant MARKET_INVARIANT_C = "MARKET_INVARIANT_C: min liquidator reward is less than to liquidator reward";//TODO

    string constant MARKET_INVARIANT_D = "MARKET_INVARIANT_D: Allowances are always paidIf any token is moved";//TODO

    string constant MARKET_INVARIANT_E = "MARKET_INVARIANT_E: rateTimestamp <= block.timestamp";//TODO

    string constant MARKET_INVARIANT_F = "MARKET_INVARIANT_F: action reverts if oracle price is invalid & rate is too old";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        YIELD BOX                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant YB_INVARIANT_A = "YB_INVARIANT_A: When elastic is 0, base is equal to 0";//TODO

    string constant YB_INVARIANT_B = "YB_INVARIANT_B: Elastic >= base";//TODO

    string constant YB_INVARIANT_C = "YB_INVARIANT_C: Elastic <= totalBorrowCap";//TODO//@audit check if this should be supplyCap

    string constant YB_INVARIANT_D = "YB_INVARIANT_D: Ratio elastic / base monotonically increases";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        BORROWING                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant BORROWING_INVARIANT_A = "BORROWING_INVARIANT_A: Opening fee is a % of amount";//TODO

    string constant BORROWING_INVARIANT_B = "BORROWING_INVARIANT_B: Self liquidation is prevented";//TODO

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                         LENDING                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant LENDING_INVARIANT_A = "LENDING_INVARIANT_A: Given an amount, user can only receive a specific number of shares";//TODO

    string constant LENDING_INVARIANT_B = "LENDING_INVARIANT_B: Given shares, user can only receive a specific amount";//TODO

    string constant LENDING_INVARIANT_C = "LENDING_INVARIANT_C: Share changes are consistent";//TODO

    string constant LENDING_INVARIANT_D = "LENDING_INVARIANT_D: Share balances changes consistenly";//TODO

    string constant LENDING_INVARIANT_E = "LENDING_INVARIANT_E: Repay amount math is sound";//TODO

    string constant LENDING_INVARIANT_F = "LENDING_INVARIANT_F: addCollateral & removeCollateral are inverse operations";//TODO

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
    //                                        GLOBAL CONFIG                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    string constant GLOBAL_CONFIG_INVARIANT_A = "GLOBAL_CONFIG_INVARIANT_A: Any transaction to a paused function wont succeed";//TODO
}