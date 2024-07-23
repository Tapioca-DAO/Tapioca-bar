// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Handler Contracts
import {CommonHandler} from "./handlers/CommonHandler.t.sol";
import {CollateralHandler} from "./handlers/CollateralHandler.t.sol";
import {BorrowHandler} from "./handlers/BorrowHandler.t.sol";
import {LeverageHandler} from "./handlers/LeverageHandler.t.sol";
import {LiquidationHandler} from "./handlers/LiquidationHandler.t.sol";
import {YieldBoxHandler} from "./handlers/YieldBoxHandler.t.sol";

// Simulators
import {DonationAttackHandler} from "./handlers/simulators/DonationAttackHandler.t.sol";
import {PriceOracleHandler} from "./handlers/simulators/PriceOracleHandler.t.sol";

/// @notice Helper contract to aggregate all handler contracts, inherited in BaseInvariants
abstract contract HandlerAggregator is
    CommonHandler, // Modules
    CollateralHandler,
    BorrowHandler,
    LeverageHandler,
    LiquidationHandler,
    YieldBoxHandler,
    DonationAttackHandler, // Simulators
    PriceOracleHandler
{
    /// @notice Helper function in case any handler requires additional setup
    function _setUpHandlers() internal {}
}
