

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {BaseHandler} from "../../base/BaseHandler.t.sol";

/// @title PriceOracleHandler
/// @notice Handler test contract for the  PriceOracle actions
contract PriceOracleHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice This function simulates changes in price
    function set(uint256 rate) external {
        oracle.set(rate);
    }

/*     /// @notice This function simulates changes in the interest rate model
    function setSuccess(bool status) external {
        oracle.setSuccess(status); 
    } */

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
