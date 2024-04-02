// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";

/// @title LeverageHandler
/// @notice Handler test contract for the market leverage modules contracts
contract LeverageHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function buyCollateral(uint256 i, uint256 borrowAmount, uint256 supplyAmount) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        bytes memory _data = "";

        (Module[] memory modules, bytes[] memory calls) = marketHelper.buyCollateral(from, borrowAmount, supplyAmount, _data);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            assert_GLOBAL_INVARIANT_A(Market.PauseType.LeverageBuy);
        }
    }

    function sellCollateral(uint256 i, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        bytes memory _data = "";

        (Module[] memory modules, bytes[] memory calls) = marketHelper.sellCollateral(from, share, _data);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            assert_GLOBAL_INVARIANT_A(Market.PauseType.LeverageBuy);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
