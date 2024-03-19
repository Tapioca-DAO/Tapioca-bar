// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Hook Contracts
import {MarketBeforeAfterHooks} from "./MarketBeforeAfterHooks.t.sol";

/// @notice Helper contract to aggregate all before / after hook contracts, inherited on each handler
abstract contract HookAggregator is
    MarketBeforeAfterHooks
{
    /// @notice Modular hook trigger
    function _before() internal {
        _marketBefore();
    }

    /// @notice Modular hook trigger
    function _after() internal {
        _marketAfter();
    }
}
