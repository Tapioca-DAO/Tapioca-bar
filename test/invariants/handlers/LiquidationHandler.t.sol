// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";

/// @title LiquidationHandler
/// @notice Handler test contract for the market liquidation modules contracts
contract LiquidationHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function liquidateBadDebt(uint256 i, uint256 j, address receiver) external setup {//TODO: Implement liquidatorReceiver version of this call
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address user = _getRandomActor(i);

        address from = _getRandomActor(j);//TODO: Find who should call this function

        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(user, from, receiver, marketLiquidatorReceiver, "", false);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            assert(true);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
