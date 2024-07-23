// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interfaces
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";

// Contracts
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";

// Test Contracts
import {Actor} from "../../utils/Actor.sol";
import {HandlerAggregator} from "../../HandlerAggregator.t.sol";

import "forge-std/console.sol";

/// @title SingularityInvariants
/// @notice Implements Invariants for the protocol
/// @notice Implements View functions assertions for the protocol, checked in assertion testing mode
/// @dev Inherits HandlerAggregator for checking actions in assertion testing mode
abstract contract SingularityInvariants is HandlerAggregator {

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        SINGULARITY                                        //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_SINGULARITY_INVARIANT_A() internal {
        assertGe(singularity.maximumTargetUtilization(), singularity.maximumTargetUtilization(), SINGULARITY_INVARIANT_A);
    }

    function assert_SINGULARITY_INVARIANT_B() internal {
        (, uint256 utilisation) = singularity.getInterestDetails();
        if (utilisation == 0) {
            return;
        }
        assertGe(utilisation, singularity.minimumTargetUtilization(), SINGULARITY_INVARIANT_B);
        assertLe(utilisation, singularity.maximumTargetUtilization(), SINGULARITY_INVARIANT_B);
    }

    function assert_SINGULARITY_INVARIANT_C() internal {
        assertGe(singularity.maximumInterestPerSecond(), singularity.minimumInterestPerSecond(), SINGULARITY_INVARIANT_C);
    }

    function assert_SINGULARITY_INVARIANT_D() internal {
        (ISingularity.AccrueInfo memory _accrueInfo,) = singularity.getInterestDetails();
        assertGe(_accrueInfo.interestPerSecond, singularity.minimumInterestPerSecond(), SINGULARITY_INVARIANT_D);
        assertLe(_accrueInfo.interestPerSecond, singularity.maximumInterestPerSecond(), SINGULARITY_INVARIANT_D);
    }

    function assert_SINGULARITY_INVARIANT_E(uint256 sumBalances) internal {
        (, uint256 base) = singularity.totalAsset();
        assertEq(base, sumBalances, SINGULARITY_INVARIANT_E);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           REBASE                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_RB_INVARIANT_E() internal {
        (uint256 elastic, uint256 base) = singularity.totalAsset();
        if (elastic == 0) {
            assertEq(base, 0, RB_INVARIANT_A);
        }
        if (base == 0) {
            assertEq(elastic, 0, RB_INVARIANT_A);
        }
    }

    function assert_RB_INVARIANT_F() internal {
        (uint256 elastic, uint256 base) = singularity.totalAsset();
        assertGe(elastic, base, RB_INVARIANT_B);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           LENDING                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_SINGULARITY_INVARIANT_G() internal {
        (, uint256 base) = singularity.totalAsset();
        assertEq(ghost_totalAssetBase, base, SINGULARITY_INVARIANT_G);
    }

    function assert_SINGULARITY_INVARIANT_H(uint256 sumGhostBalances) internal {
        assertGe(sumGhostBalances, ghost_totalAssetBase, SINGULARITY_INVARIANT_H);
    }
}
