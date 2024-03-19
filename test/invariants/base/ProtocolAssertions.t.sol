// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {BaseTest} from "./BaseTest.t.sol";
import {StdAsserts} from "test/invariants/utils/StdAsserts.sol";

/// @title ProtocolAssertions
/// @notice Helper contract for protocol specific assertions
abstract contract ProtocolAssertions is StdAsserts, BaseTest {
    /// @notice Asserts that a type of protocol functionality is paused
    function assertPaused(Market.PauseType pauseType) internal {
        assertTrue(Market(target).pauseOptions(pauseType), "ProtocolAssertions: not paused");
    }
}
