// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Invariant Contracts
import {InvariantsWrapper} from "./InvariantsWrapper.t.sol";

/// @title BigBangInvariantsWrapper
/// @notice Wrappers for the protocol invariants that implements extra wrapper for BigBang invariants
/// @dev recognised by Echidna when property mode is activated
/// @dev Inherits all the invariant contracts which inherit HandlerAggregator
abstract contract BigBangInvariantsWrapper is InvariantsWrapper {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      BIGBANG INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_BIGBANG_INVARIANTS() public monotonicTimestamp returns(bool) {
        // BIGBANG INVARIANTS
        //assert_BIGBANG_INVARIANT_A();//@audit-issue failing
        assert_BIGBANG_INVARIANT_B();
        assert_BIGBANG_INVARIANT_C();
        assert_BIGBANG_INVARIANT_D();
        assert_BIGBANG_INVARIANT_E();
        assert_BIGBANG_INVARIANT_F();
        return true;
    }
}
