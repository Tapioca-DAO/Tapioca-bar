// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {Module} from "tap-utils/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IMarket} from "tap-utils/interfaces/bar/ISingularity.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_borrow is BigBang_Unit_Shared {
    function test_Borrow_WhenContractIsPaused(uint256 collateralAmount, uint256 borrowAmount)
        external
        whenContractIsPaused
        whenOracleRateIsEth
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        (Module[] memory modules, bytes[] memory calls) = _getBorrowData(borrowAmount, address(this), address(this));

        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);
    }

    function test_Borrow_WhenCalledForItself(uint256 collateralAmount, uint256 borrowAmount)
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        (Module[] memory modules, bytes[] memory calls) = _getBorrowData(borrowAmount, address(mainBB), address(mainBB));

        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        mainBB.execute(modules, calls, true);

        // it should revert with 'Market: cannot execute on itself'
        (modules, calls) = _getBorrowData(borrowAmount, address(secondaryBB), address(secondaryBB));
        vm.expectRevert("Market: cannot execute on itself");
        secondaryBB.execute(modules, calls, true);
    }

    function test_Borrow_RevertGiven_AmountIsTooLow(uint256 collateralAmount, uint256 borrowAmount)
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = bound(borrowAmount, 1, mainBB._minBorrowAmount());
        (Module[] memory modules, bytes[] memory calls) = _getBorrowData(borrowAmount, address(this), address(this));

        // min amount revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        borrowAmount = bound(borrowAmount, 1, secondaryBB._minBorrowAmount());
        (modules, calls) = _getBorrowData(borrowAmount, address(this), address(this));

        // min amount revert
        vm.expectRevert();
        secondaryBB.execute(modules, calls, true);
    }

    function test_Borrow_givenCalledForAValidSenderByItself_WhenOpeningFeeIsNotZero(
        uint256 collateralAmount,
        uint256 borrowAmount
    )
        external
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        // **** Secondary BB market ****
        // add collateral
        _addCollateral(collateralAmount, secondaryBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, secondaryBB, address(this), address(this), address(this));
    }

    function test_Borrow_givenCalledForAValidSenderByItself_WhenOpeningFeeIsZero(
        uint256 collateralAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        // **** Secondary BB market ****
        // add collateral
        _addCollateral(collateralAmount, secondaryBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, secondaryBB, address(this), address(this), address(this));
    }

    function test_Borrow_RevertWhen_BorrowCapIsFullyReached(uint256 collateralAmount, uint256 borrowAmount)
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        _setBorrowCap(borrowAmount - 1, mainBB);

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        (Module[] memory modules, bytes[] memory calls) = _getBorrowData(borrowAmount, address(this), address(this));
        //BorrowCapReached
        //        │   │   └─ ← [Return] false
        // │   │   │   └─ ← [Revert] BorrowCapReached()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_Borrow_WhenPositionIsNotSolvent(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        (Module[] memory modules, bytes[] memory calls) =
            _getBorrowData(maxBorrowAmount * 2, address(this), address(this));
        vm.expectRevert("Market: insolvent");
        mainBB.execute(modules, calls, true);
    }

    function test_Borrow_givenCalledFromAnotherUser_GivenUserDoesNotHaveEnoughAllowance(
        uint256 collateralAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        (Module[] memory modules, bytes[] memory calls) = _getBorrowData(borrowAmount, address(this), address(this));

        // it should revert with 'Market: not approved'
        _resetPrank(userA);
        vm.expectRevert("Market: not approved");
        mainBB.execute(modules, calls, true);
    }

    function test_Borrow_givenCalledFromAnotherUser_givenUserHasAllowance_WhenOpeningFeeIsNotZero(
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
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        mainBB.approveBorrow(address(userA), type(uint256).max);
        _borrow(borrowAmount, mainBB, userA, address(this), address(this));

        // **** Secondary BB market ****
        // add collateral
        _addCollateral(collateralAmount, secondaryBB, address(this), address(this), address(this), address(this), false);

        // borrow
        secondaryBB.approveBorrow(address(userA), type(uint256).max);
        _borrow(borrowAmount, secondaryBB, userA, address(this), address(this));
    }

    function test_Borrow_givenCalledFromAnotherUser_givenUserHasAllowance_WhenOpeningFeeIsZero(
        uint256 collateralAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        mainBB.approveBorrow(address(userA), type(uint256).max);
        _borrow(borrowAmount, mainBB, userA, address(this), address(this));

        // **** Secondary BB market ****
        // add collateral
        _addCollateral(collateralAmount, secondaryBB, address(this), address(this), address(this), address(this), false);

        // borrow
        secondaryBB.approveBorrow(address(userA), type(uint256).max);
        _borrow(borrowAmount, secondaryBB, userA, address(this), address(this));
    }

    function test_Borrow_givenCalledFromAnotherUser_givenUserHasAllowance_RevertWhen_BorrowCapIsReached(
        uint256 collateralAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        _setBorrowCap(borrowAmount - 1, mainBB);

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        (Module[] memory modules, bytes[] memory calls) = _getBorrowData(borrowAmount, address(this), address(this));
        mainBB.approveBorrow(address(userA), type(uint256).max);
        _resetPrank(userA);
        //BorrowCapReached
        //        │   │   └─ ← [Return] false
        // │   │   │   └─ ← [Revert] BorrowCapReached()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }
}
