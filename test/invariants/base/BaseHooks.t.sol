// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {ProtocolAssertions} from "./ProtocolAssertions.t.sol";
import {InvariantsSpec} from "../InvariantsSpec.t.sol";

/// @title BaseHooks
/// @notice Contains common logic for all handlers
/// @dev inherits all suite assertions since per-action assertions are implemented in the handlers
/// @dev inherits InvariantsSpec in order to be used in postconditions and invariants files
contract BaseHooks is ProtocolAssertions, InvariantsSpec {

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                  POST CONDITION INVARIANTS                                //
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function assert_GLOBAL_INVARIANT_A(Market.PauseType pauseType) internal {
        assertFalse(Market(target).pauseOptions(pauseType), GLOBAL_INVARIANT_A);
    }

    function assert_COMMON_INVARIANT_E(Market.PauseType pauseType) internal {
        assertTrue(Market(target).pauseOptions(pauseType), COMMON_INVARIANT_E);
    }
}
