// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// mocks
import {TOFTMock_test} from "../../../mocks/TOFTMock_test.sol";

// contracts
import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

contract MarketLiquidatorReceiver_querySellToken is MarketLiquidatorReceiver_Unit_Shared {
    TOFTMock_test toft;

    function setUp() public override {
        super.setUp();

        toft = new TOFTMock_test(address(weth), IPearlmit(address(pearlmit)));
    }

    function test_WhenQuerySellTokenIsCalled() external {
        address queryToken = receiver.querySellToken(address(toft));
        assertEq(queryToken, address(weth));
    }

    function test_WhenMarketLiquidatorReceiverCreated() external {
        assertEq(receiver.weth(), address(weth));
        assertEq(address(receiver.cluster()), address(cluster));
        assertEq(receiver.swapper(), address(swapper));
        assertEq(receiver.owner(), address(this));
    }
}
