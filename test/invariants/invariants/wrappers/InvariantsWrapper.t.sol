// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Invariant Contracts
import {CommonInvariants} from "../assertions/CommonInvariants.t.sol";
import {MarketInvariants} from "../assertions/MarketInvariants.t.sol";
import {RebaseInvariants} from "../assertions/RebaseInvariants.t.sol";
import {BigBangInvariants} from "../assertions/BigBangInvariants.t.sol";
import {SingularityInvariants} from "../assertions/SingularityInvariants.t.sol";

// Interfaces
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";

/// @title InvariantsWrapper
/// @notice Wrappers for the protocol invariants implemented in the invariant folder
/// @dev recognised by Echidna when property mode is activated
/// @dev Inherits all the invariant contracts which inherit HandlerAggregator
abstract contract InvariantsWrapper is
    CommonInvariants,
    MarketInvariants,
    RebaseInvariants,
    BigBangInvariants,
    SingularityInvariants
{
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       COMMON INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_common_invariants() public monotonicTimestamp returns(bool) {
        assert_COMMON_INVARIANT_B();
        assert_COMMON_INVARIANT_C();
        assert_COMMON_INVARIANT_F();

        for (uint256 i; i < NUMBER_OF_ACTORS; i++) {
            assert_COMMON_INVARIANT_A(actorAddresses[i]);
        }
        return true;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                        MARKET INVARIANTS                                  //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_market_invariants() public monotonicTimestamp returns(bool) {
        assert_MARKET_INVARIANT_A();
        assert_MARKET_INVARIANT_B();
        assert_MARKET_INVARIANT_E();

        uint256 sumUserBorrowPart;
        for (uint256 i; i < NUMBER_OF_ACTORS; i++) {
            assert_MARKET_INVARIANT_C(actorAddresses[i]);
            sumUserBorrowPart += ghost_userBorrowPart[actorAddresses[i]];
        }
        assert_BORROWING_INVARIANT_B(sumUserBorrowPart);
        return true;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                     BORROWING INVARIANTS                                  //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_borrowing_invariants() public monotonicTimestamp returns(bool) {
        // Calculate sum of userBorrowPart and sum of userElasticDebt
        uint256 sumUserBorrowPart;
        uint256 sumUserElasticDebt;
        for (uint256 i; i < NUMBER_OF_ACTORS; i++) {
            uint256 part = IMarket(target)._userBorrowPart(actorAddresses[i]);
            sumUserBorrowPart += part;
            sumUserElasticDebt += _toElastic(part, false);
        }

        if (sumUserBorrowPart >= 1) {
            sumUserElasticDebt++;
        }

        // Properties
        assert_BORROWING_INVARIANT_D(sumUserBorrowPart);
        assert_BORROWING_INVARIANT_E(sumUserElasticDebt);
        return true;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      LENDING INVARIANTS                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_lending_invariants() public monotonicTimestamp returns(bool) {
        // Calculate sum of userCollateralShare
        uint256 sumUserCollateralShare;
        uint256 sumGhostBalances;
        for (uint256 i; i < NUMBER_OF_ACTORS; i++) {
            sumUserCollateralShare +=  IMarket(target)._userCollateralShare(actorAddresses[i]);
            sumGhostBalances += ghost_userCollateralShare[actorAddresses[i]];
        }

        // Properties
        assert_LENDING_INVARIANT_D(sumUserCollateralShare);
        assert_LENDING_INVARIANT_H();
        assert_LENDING_INVARIANT_I(sumGhostBalances);
        return true;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      YIELDBOX INVARIANTS                                  //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function echidna_yieldbox_invariants() public monotonicTimestamp returns(bool) {
        assert_RB_INVARIANT_A();
        assert_RB_INVARIANT_B();
        assert_RB_INVARIANT_C();
        return true;
    }
}
