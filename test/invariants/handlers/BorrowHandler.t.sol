// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";

/// @title BorrowHandler
/// @notice Handler test contract for the market borrow modules contracts
contract BorrowHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function borrow(uint256 i, uint256 j, uint256 amount) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        address to = _getRandomActor(j);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.borrow(from, to, amount);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            assert(true);
        }
    }

    function repay(uint256 i, uint256 j, bool skim, uint256 part) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        address to = _getRandomActor(j);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.repay(from, to, skim, part);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            assert(true);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
