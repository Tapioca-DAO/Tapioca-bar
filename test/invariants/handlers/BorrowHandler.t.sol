
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";

/// @title BorrowHandler
/// @notice Handler test contract for the market borrow modules contracts
contract BorrowHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function borrow(uint256 i, uint256 amount) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address to = _getRandomActor(i);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.borrow(address(actor), to, amount);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            (uint128 _elastic, uint128 _base) = Market(target).totalBorrow();

            Rebase memory _totalBorrow = Rebase(_elastic, _base);

            uint256 base = RebaseLibrary.toBase(_totalBorrow, amount, true);

            _increaseGhostBorrow(to, base);

            // POST CONDITIONS
            assert_BORROWING_INVARIANT_C(amount);
            assert_BORROWING_INVARIANT_F();

            assert_GLOBAL_INVARIANT_A(Market.PauseType.Borrow);
        }
    }

    function repay(uint256 i, bool skim, uint256 part) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address to = _getRandomActor(i);

        uint256 totalSupply = usdo.totalSupply();

        (Module[] memory modules, bytes[] memory calls) = marketHelper.repay(address(actor), to, skim, part);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            _decreaseGhostBorrow(to, part);

            // POST CONDITIONS
            assert_GLOBAL_INVARIANT_A(Market.PauseType.Repay);

            if (targetType == MarketType.BIGBANG) {
                assert_BIGBANG_INVARIANT_G();
                assert_BIGBANG_INVARIANT_H();

                assertEq(usdo.totalSupply(), totalSupply - part, BORROWING_INVARIANT_G);
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
