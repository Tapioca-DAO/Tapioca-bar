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
        _singularityBefore();
        _bigBangBefore();
    }

    /// @notice Modular hook trigger
    function _after() internal {
        _marketAfter();
        _singularityAfter();
        _bigBangAfter();

        // POST CONDITIONS
        _postConditions();
        _singularityPostConditions();
    }

    /// @notice Postconditions trigger
    function _postConditions() internal {
        // MARKET
        assert_MARKET_INVARIANT_F();
        
        // REBASE
        assert_RB_INVARIANT_D();

    }

    /// @notice Singularity-only postconditions trigger
    function _singularityPostConditions() internal onlyTargetMarket(MarketType.SINGULARITY) {
        // REBASE
        assert_RB_INVARIANT_G();
    }
}
