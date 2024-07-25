// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_constructor is BigBang_Unit_Shared {
    function test_WhenBigBangIsCreated() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        assertEq(address(bb._asset()), address(usdo));
        assertEq(address(bb._collateral()), address(mainToken));
        assertEq(address(bb._oracle()), address(oracle));
        assertEq(bb._assetId(), usdoId);
        assertEq(bb._collateralId(), mainTokenId);
        assertEq(bb._protocolFee(), 10000);
        assertEq(bb._collateralizationRate(), 75000);
        assertEq(bb._liquidationCollateralizationRate(), 80000);
        assertEq(bb._exchangeRatePrecision(), 1 ether);
        assertEq(bb._minLiquidatorReward(), 88e3);
        assertEq(bb._maxLiquidatorReward(), 925e2);
        assertEq(bb._liquidationBonusAmount(), 3e3);
        assertEq(bb._liquidationMultiplier(), 12000);
        assertEq(bb._rateValidDuration(), 24 hours);
        assertEq(bb.minMintFee(), 0);
        assertEq(bb.maxMintFee(), 1000);
        assertEq(bb.maxMintFeeStart(), 980000000000000000);
        assertEq(bb.minMintFeeStart(), 1000000000000000000);
        assertEq(bb._minBorrowAmount(), 1e15);
        assertEq(bb._minCollateralAmount(), 1e15);
    }
}
