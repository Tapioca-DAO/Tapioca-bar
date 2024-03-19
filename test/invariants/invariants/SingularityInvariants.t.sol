// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interfaces
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";

// Contracts
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";

// Test Contracts
import {Actor} from "../utils/Actor.sol";
import {HandlerAggregator} from "../HandlerAggregator.t.sol";

/// @title SingularityInvariants
/// @notice Implements Invariants for the protocol
/// @notice Implements View functions assertions for the protocol, checked in assertion testing mode
/// @dev Inherits HandlerAggregator for checking actions in assertion testing mode
abstract contract SingularityInvariants is HandlerAggregator {

    function assert_SINGULARITY_INVARIANT_A() internal {
        assertGe(singularity.maximumTargetUtilization(), singularity.minimumTargetUtilization(), SINGULARITY_INVARIANT_A);
    }

    function assert_SINGULARITY_INVARIANT_B() internal {
        (, uint256 utilisation) = singularity.getInterestDetails();
        assertGe(utilisation, singularity.minimumTargetUtilization(), SINGULARITY_INVARIANT_B);
        assertLe(utilisation, singularity.maximumTargetUtilization(), SINGULARITY_INVARIANT_B);
    }

    function assert_SINGULARITY_INVARIANT_C() internal {
        assertGe(singularity.maximumInterestPerSecond(), singularity.minimumInterestPerSecond(), SINGULARITY_INVARIANT_C);
    }

    function assert_SINGULARITY_INVARIANT_D() internal {
        (ISingularity.AccrueInfo memory _accrueInfo, uint256 utilisation) = singularity.getInterestDetails();
        assertGe(_accrueInfo.interestPerSecond, singularity.minimumInterestPerSecond(), SINGULARITY_INVARIANT_D);
        assertLe(_accrueInfo.interestPerSecond, singularity.maximumInterestPerSecond(), SINGULARITY_INVARIANT_D);
    }
}
