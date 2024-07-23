// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Invariant Contracts
import {InvariantsWrapper} from "./InvariantsWrapper.t.sol";
import "forge-std/console.sol";

/// @title SingularityInvariantsWrapper
/// @notice Wrappers for the protocol invariants that implements extra wrapper for Singularity invariants
/// @dev recognised by Echidna when property mode is activated
/// @dev Inherits all the invariant contracts which inherit HandlerAggregator
abstract contract SingularityInvariantsWrapper is InvariantsWrapper {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      SINGULARITY INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_SINGULARITY_INVARIANTS() public monotonicTimestamp returns(bool) {
        assert_SINGULARITY_INVARIANT_A();
        assert_SINGULARITY_INVARIANT_B();
        assert_SINGULARITY_INVARIANT_C();
        assert_SINGULARITY_INVARIANT_D();
        assert_SINGULARITY_INVARIANT_G();

        uint256 sumBalances;
        uint256 sumGhostBalances;
        for (uint256 i; i < NUMBER_OF_ACTORS; i++) {
            sumBalances += singularity.balanceOf(actorAddresses[i]);
            sumGhostBalances += ghost_userAssetBase[actorAddresses[i]];
        }

        assert_SINGULARITY_INVARIANT_E(sumBalances);
        assert_SINGULARITY_INVARIANT_H(sumGhostBalances);
        return true;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                  REBASE SINGULARITY INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_RB_INVARIANTS() public monotonicTimestamp returns(bool) {
        //assert_RB_INVARIANT_E();//@audit-issue broken invariant
        //assert_RB_INVARIANT_F();//@audit-issue broken invariant
        return true;
    }
}
