// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {IMarket} from "tapioca-periph/interfaces/bar/ISingularity.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_buyCollateral is BigBang_Unit_Shared {
    function test_buyCollateral_RevertWhen_WhenContractIsPaused(uint256 leverageAmount) external whenContractIsPaused {
        (Module[] memory modules, bytes[] memory calls) = _getLeverageUpData(leverageAmount, 0, address(this));
        // **** Main BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);
    }

    function test_buyCollateral_RevertWhen_WhenCalledForItself(uint256 leverageAmount)
        external
        whenContractIsNotPaused
    {
        (Module[] memory modules, bytes[] memory calls) = _getLeverageUpData(leverageAmount, 0, address(mainBB));

        // **** Main BB market ****
        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        (modules, calls) = _getLeverageUpData(leverageAmount, 0, address(secondaryBB));
        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        secondaryBB.execute(modules, calls, true);
    }

    function test_buyCollateral_RevertWhen_BuyCollateralIsCalledAndLeverageExecutorIsAddressZero(uint256 leverageAmount)
        external
        whenContractIsNotPaused
    {
        // **** Main BB market ****
        _setLeverageExecutor(address(0), mainBB);
        (Module[] memory modules, bytes[] memory calls) = _getLeverageUpData(leverageAmount, 0, address(this));
        // it should revert
        //      │   │   │   └─ ← [Revert] LeverageExecutorNotValid()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        _setLeverageExecutor(address(0), secondaryBB);
        (modules, calls) = _getLeverageUpData(leverageAmount, 0, address(this));
        // it should revert
        //      │   │   │   └─ ← [Revert] LeverageExecutorNotValid()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        secondaryBB.execute(modules, calls, true);
    }

    function test_buyCollateral_RevertWhen_PositionIsNotSolvent(
        uint256 leverageAmount,
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

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        // assure insolvency
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));
        leverageAmount = maxBorrowAmount * 2; //_boundLeverageUpAmount(leverageAmount, mainBB);
        uint256 supplyAmount = 0;
        oracle.set(1e18);

        (Module[] memory modules, bytes[] memory calls) =
            _getLeverageUpData(leverageAmount, supplyAmount, address(this));
        vm.expectRevert("Market: insolvent");
        mainBB.execute(modules, calls, true);
    }

    function test_buyCollateral_RevertWhen_LeverageExecutorReturnsAmountZero(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        leverageExecutor.setReturnZero(true);

        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageUpAmount(leverageAmount, mainBB);

        (Module[] memory modules, bytes[] memory calls) = _getLeverageUpData(leverageAmount, 0, address(this));
        //         │   │   │   └─ ← [Revert] CollateralShareNotValid()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_buyCollateral_WhenBorrowCapIsNotReached(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        givenBorrowCapIsNotReachedYet
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        _leverageUp(
            collateralAmount, borrowAmount, leverageAmount, 0, mainBB, address(this), address(this), address(this)
        );

        // **** Secondary BB market ****
        _leverageUp(
            collateralAmount, borrowAmount, leverageAmount, 0, secondaryBB, address(this), address(this), address(this)
        );
    }

    function test_buyCollateral_WhenSupplyShareIsNotZero(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 supplyAmount
    )
        external
        whenContractIsNotPaused
        givenBorrowCapIsNotReachedYet
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        vm.assume(supplyAmount > 0 && supplyAmount < SMALL_AMOUNT);

        // **** Main BB market ****
        _spawnAsset(supplyAmount, address(this));
        uint256 share = yieldBox.toShare(mainBB._assetId(), supplyAmount, false);
        _depositToYieldBox(mainBB._asset(), mainBB._assetId(), share, address(this), address(this));
        _leverageUp(
            collateralAmount,
            borrowAmount,
            leverageAmount,
            supplyAmount,
            mainBB,
            address(this),
            address(this),
            address(this)
        );

        // // **** Secondary BB market ****
        _spawnAsset(supplyAmount, address(this));
        share = yieldBox.toShare(secondaryBB._assetId(), supplyAmount, false);
        _depositToYieldBox(secondaryBB._asset(), secondaryBB._assetId(), share, address(this), address(this));
        _leverageUp(
            collateralAmount,
            borrowAmount,
            leverageAmount,
            supplyAmount,
            secondaryBB,
            address(this),
            address(this),
            address(this)
        );
    }

    function test_buyCollateral_RevertWhen_BorrowCapIsReached(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        uint256 supplyAmount = 0;

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageUpAmount(leverageAmount, mainBB);
        _setBorrowCap(100, mainBB);
        (Module[] memory modules, bytes[] memory calls) =
            _getLeverageUpData(leverageAmount, supplyAmount, address(this));
        //         │   │   │   └─ ← [Revert] BorrowCapReached()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_buyCollateral_whenItsCalledFromAnotherUser_WhenUserDoesNotHaveEnoughAllowance(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        givenBorrowCapIsNotReachedYet
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        // it should revert with 'Market: not approved'
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        uint256 supplyAmount = 0;

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageUpAmount(leverageAmount, mainBB);

        (Module[] memory modules, bytes[] memory calls) =
            _getLeverageUpData(leverageAmount, supplyAmount, address(this));

        _resetPrank(userA);
        //         │   │   │   └─ ← [Revert] revert: Market: not approved
        // │   │   └─ ← [Revert] revert: Market: not approved
        // │   └─ ← [Revert] revert: Market: not approved
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_buyCollateral_whenItsCalledFromAnotherUser_whenUserHasBeenGivenAllowance_RevertWhen_LeverageExecutorReturnsAmountZero(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        givenBorrowCapIsNotReachedYet
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        // it should revert
        leverageExecutor.setReturnZero(true);
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        uint256 supplyAmount = 0;

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageUpAmount(leverageAmount, mainBB);

        (Module[] memory modules, bytes[] memory calls) =
            _getLeverageUpData(leverageAmount, supplyAmount, address(this));

        mainBB.approveBorrow(address(userA), type(uint256).max);
        _resetPrank(userA);
        //         │   │   │   └─ ← [Revert] CollateralShareNotValid()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_buyCollateral_whenItsCalledFromAnotherUser_whenUserHasBeenGivenAllowance_WhenBorrowCapIsNotMet(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        givenBorrowCapIsNotReachedYet
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        mainBB.approveBorrow(address(userA), type(uint256).max);
        _leverageUp(collateralAmount, borrowAmount, leverageAmount, 0, mainBB, userA, address(this), address(this));

        // **** Secondary BB market ****
        _resetPrank(address(this));
        secondaryBB.approveBorrow(address(userA), type(uint256).max);
        _leverageUp(collateralAmount, borrowAmount, leverageAmount, 0, secondaryBB, userA, address(this), address(this));
    }

    function test_buyCollateral_whenItsCalledFromAnotherUser_whenUserHasBeenGivenAllowance_WhenSupplyShareIsNon_zero(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 supplyAmount
    )
        external
        whenContractIsNotPaused
        givenBorrowCapIsNotReachedYet
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        vm.assume(supplyAmount > 0 && supplyAmount < SMALL_AMOUNT);

        // **** Main BB market ****
        _spawnAsset(supplyAmount, address(this));
        uint256 share = yieldBox.toShare(mainBB._assetId(), supplyAmount, false);
        _depositToYieldBox(mainBB._asset(), mainBB._assetId(), share, address(this), address(this));
        mainBB.approveBorrow(address(userA), type(uint256).max);
        _leverageUp(
            collateralAmount, borrowAmount, leverageAmount, supplyAmount, mainBB, userA, address(this), address(this)
        );

        // **** Secondary BB market ****
        _resetPrank(address(this));
        _spawnAsset(supplyAmount, address(this));
        share = yieldBox.toShare(secondaryBB._assetId(), supplyAmount, false);
        _depositToYieldBox(secondaryBB._asset(), secondaryBB._assetId(), share, address(this), address(this));
        secondaryBB.approveBorrow(address(userA), type(uint256).max);
        _leverageUp(
            collateralAmount,
            borrowAmount,
            leverageAmount,
            supplyAmount,
            secondaryBB,
            userA,
            address(this),
            address(this)
        );
    }

    function test_buyCollateral_whenItsCalledFromAnotherUser_whenUserHasBeenGivenAllowance_RevertWhen_BorrowCapIsMet(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 supplyAmount
    )
        external
        whenContractIsNotPaused
        givenBorrowCapIsNotReachedYet
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        vm.assume(supplyAmount > 0 && supplyAmount < SMALL_AMOUNT);

        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageUpAmount(leverageAmount, mainBB);
        _setBorrowCap(100, mainBB);
        (Module[] memory modules, bytes[] memory calls) =
            _getLeverageUpData(leverageAmount, supplyAmount, address(this));
        //         │   │   │   └─ ← [Revert] BorrowCapReached()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        _resetPrank(userA);
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }
}
