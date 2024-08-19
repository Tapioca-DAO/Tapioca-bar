// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {IMarket} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

import {ZeroXSwapperMockTarget_test} from "../../../mocks/ZeroXSwapperMockTarget_test.sol";
import {TOFTMock_test} from "../../../mocks/TOFTMock_test.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_liquidate is BigBang_Unit_Shared {
    function test_liquidate_WhenContractIsPaused() external whenContractIsPaused {
        (Module[] memory modules, bytes[] memory calls) = _getLiquidationData(address(this), "", SMALL_AMOUNT, MIN_LIQUIDATION_BONUS);
        // **** Main BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateIsCalledForNoUsers()
        external
        whenContractIsNotPaused
    {
        address[] memory users = new address[](0);
        uint256[] memory borrowParts = new uint256[](0);
        uint256[] memory minLiquidationBonuses = new uint256[](0);
        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](0);
        bytes[] memory receiverData = new bytes[](0);

        (Module[] memory modules, bytes[] memory calls) = 
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);

        // **** Main BB market ****
        //         │   │   │   └─ ← [Revert] NothingToLiquidate()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        //         │   │   │   └─ ← [Revert] NothingToLiquidate()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        secondaryBB.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateIsCalledForDifferentArrays()
        external
        whenContractIsNotPaused
    {
        address[] memory users = new address[](1);
        users[0] = address(this);
        uint256[] memory borrowParts = new uint256[](0);
        uint256[] memory minLiquidationBonuses = new uint256[](0);
        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](0);
        bytes[] memory receiverData = new bytes[](0);
        
        (Module[] memory modules, bytes[] memory calls) = 
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);

        //         │   │   │   └─ ← [Revert] LengthMismatch()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        //    if (users.length != maxBorrowParts.length) revert LengthMismatch();
        // if (users.length != liquidatorReceivers.length) revert LengthMismatch();
        // if (liquidatorReceiverDatas.length != liquidatorReceivers.length) {
        borrowParts = new uint256[](1);
        borrowParts[0] = SMALL_AMOUNT;
        (modules, calls) = 
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
        //         │   │   │   └─ ← [Revert] LengthMismatch()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        minLiquidationBonuses = new uint256[](1);
        minLiquidationBonuses[0] = MIN_LIQUIDATION_BONUS;
        (modules, calls) = 
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
        //         │   │   │   └─ ← [Revert] LengthMismatch()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        receivers = new IMarketLiquidatorReceiver[](1);
        receivers[0] = IMarketLiquidatorReceiver(address(liquidatorReceiver));
        (modules, calls) = 
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
        //         │   │   │   └─ ← [Revert] LengthMismatch()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);


    }

    function test_RevertWhen_LiquidateIsCalledForSolventUsers(
        uint256 collateralAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        // **** Add collateral ****
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // **** Borrow ****
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        (Module[] memory modules, bytes[] memory calls) = _getLiquidationData(address(this), "", SMALL_AMOUNT, MIN_LIQUIDATION_BONUS);
        // it should revert
        vm.expectRevert("BB: no users found");
        mainBB.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateIsCalledAndReturnedShareIsLessThanBorrowShare(
        uint256 collateralAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
        whenWhitelisted(address(this)) 
        whenWhitelisted(address(mainBB)) 
        whenWhitelisted(address(secondaryBB)) 
        whenWhitelisted(address(liquidatorReceiver)) 
    {
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));
        maxBorrowAmount = maxBorrowAmount - (maxBorrowAmount * 6e4 / 1e5);
        // **** Main BB market ****
        _liquidate(collateralAmount, 7e14, maxBorrowAmount, mainBB, MIN_LIQUIDATION_BONUS);

        // **** Secondary BB market ****
        _liquidate(collateralAmount, 7e14, maxBorrowAmount, secondaryBB, MIN_LIQUIDATION_BONUS);
    }

    function test_whenParametersAreValid_WhenCollateralDoesNotCoverBorrowAmount(
        uint256 collateralAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        // **** Add collateral ****
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // **** Borrow ****
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));
        maxBorrowAmount = maxBorrowAmount - (maxBorrowAmount * 2e4 / 1e5);
        _borrow(maxBorrowAmount, mainBB, address(this), address(this), address(this));

        uint256 oracleRate = oracle.rate();
        oracle.set(oracleRate * 2);

        // compute asset amount
        SZeroXSwapData memory szeroXSwapData = SZeroXSwapData({
            sellToken: TOFTMock_test(payable(mainBB._collateral())).erc20(),
            buyToken: mainBB._asset(),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                ZeroXSwapperMockTarget_test.transferTokens.selector, mainBB._asset(), maxBorrowAmount / 2
            )
        });
        SSwapData memory sswapData = SSwapData({
            minAmountOut: 0,
            data: szeroXSwapData
        });
        bytes memory swapData = abi.encode(sswapData);

        (Module[] memory modules, bytes[] memory calls) = _getLiquidationData(address(this), swapData, maxBorrowAmount, MIN_LIQUIDATION_BONUS);
        //         │   │   │   └─ ← [Revert] BadDebt()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        // └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }


    function test_whenParametersAreValid_whenClosingFactorIsLessThanCurrentCollateral_WhenMinLiquidationBonusIsMet(
        uint256 collateralAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
        whenWhitelisted(address(this)) 
        whenWhitelisted(address(mainBB)) 
        whenWhitelisted(address(secondaryBB)) 
        whenWhitelisted(address(liquidatorReceiver)) 
    {
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));
        
        // **** Main BB market ****
        _liquidate(collateralAmount, 7e14, maxBorrowAmount, mainBB, MIN_LIQUIDATION_BONUS);

        return;
        // **** Secondary BB market ****
        _liquidate(collateralAmount, 7e14, maxBorrowAmount, secondaryBB, MIN_LIQUIDATION_BONUS);
    }
}
