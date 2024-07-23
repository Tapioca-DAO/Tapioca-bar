// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Test Contracts
import {SingularityInvariantsWrapper} from "./invariants/wrappers/SingularityInvariantsWrapper.t.sol";
import {Setup} from "./Setup.t.sol";

import "forge-std/console.sol";

/// @title Tester
/// @notice Entry point for invariant testing, inherits all contracts, invariants & handler
/// @dev Mono contract that contains all the testing logic
contract Tester is SingularityInvariantsWrapper, Setup {
    constructor() payable {
        setUp();
    }

    /// @dev Foundry compatibility faster setup debugging
    function setUp() internal {
        // Deploy protocol contracts and protocol actors
        _setUpSingularity();

        // Deploy actors
        _setUpActors();
    }

    /// @dev Needed in order for foundry to recognise the contract as a test, faster debugging
    //function testAux() public view {}
}
