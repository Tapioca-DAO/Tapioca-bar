// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";

/// @title CollateralHandler
/// @notice Handler test contract for the market collateral modules contracts
contract CollateralHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function addCollateral(uint256 i, uint256 j, bool skim, uint256 amount, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        address to = _getRandomActor(j);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.addCollateral(from, to, skim, amount, share);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            assert(true);
        }
    }

    function removeCollateral(uint256 i, uint256 j, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        address to = _getRandomActor(j);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.removeCollateral(from, to, share);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            assert(true);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
