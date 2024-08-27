// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {Origins} from "contracts/markets/Origins/Origins.sol";

import {Origins_Unit_Shared} from "../../shared/Origins_Unit_Shared.t.sol";

contract Origins_constructor is Origins_Unit_Shared {
    function test_WhenOriginsIsCreated() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        assertEq(address(org._asset()), address(usdo));
        assertEq(address(org._collateral()), address(mainToken));
        assertEq(address(org._oracle()), address(oracle));
        assertEq(org._assetId(), usdoId);
        assertEq(org._collateralId(), mainTokenId);
        assertEq(org._collateralizationRate(), 90000);
        assertEq(org._exchangeRatePrecision(), 1 ether);
        assertEq(org._minBorrowAmount(), 1e15);
        assertEq(org._rateValidDuration(), 24 hours);
    }
}
