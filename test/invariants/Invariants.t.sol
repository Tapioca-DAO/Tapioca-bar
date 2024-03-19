// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Invariant Contracts
import {CommonInvariants} from "./invariants/CommonInvariants.t.sol";
import {BigBangInvariants} from "./invariants/BigBangInvariants.t.sol";
import {SingularityInvariants} from "./invariants/SingularityInvariants.t.sol";

/// @title Invariants
/// @notice Wrappers for the protocol invariants implemented in the invariant folder
/// @dev recognised by Echidna when property mode is activated
/// @dev Inherits all the invariant contracts which inherit HandlerAggregator
abstract contract Invariants is
    CommonInvariants,
    BigBangInvariants,
    SingularityInvariants
{
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       COMMON INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////


    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      BIGBANG INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_BIGBANG_INVARIANTS() internal onlyTargetMarket(MarketType.BIGBANG) {
        assert_BIGBANG_INVARIANT_A();
        assert_BIGBANG_INVARIANT_B();
        assert_BIGBANG_INVARIANT_C();
        assert_BIGBANG_INVARIANT_D();
        assert_BIGBANG_INVARIANT_E();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      SINGULARITY INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_SINGULARITY_INVARIANTS() internal onlyTargetMarket(MarketType.SINGULARITY) {
        assert_SINGULARITY_INVARIANT_A();
        assert_SINGULARITY_INVARIANT_B();
        assert_SINGULARITY_INVARIANT_C();
        assert_SINGULARITY_INVARIANT_D();
    }
}
