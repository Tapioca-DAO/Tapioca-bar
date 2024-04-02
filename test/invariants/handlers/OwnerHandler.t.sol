// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Interfaces
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {BaseHandler} from "../base/BaseHandler.t.sol";

/// @title OwnerHandler
/// @notice Handler test contract for the market liquidation modules contracts
contract OwnerHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function updatePause(Market.PauseType pauseType, bool pause, bool resetAccrueTimestmap) external setup {
        bool success;
        bytes memory returnData;

        if (targetType == MarketType.BIGBANG) {
            bigBang.updatePause(pauseType, pause);
        } else {
            singularity.updatePause(pauseType, pause, resetAccrueTimestmap);
        }

        assert_COMMON_INVARIANT_E(pauseType);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

}
