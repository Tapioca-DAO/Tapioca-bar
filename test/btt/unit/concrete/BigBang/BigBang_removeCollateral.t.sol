// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_removeCollateral is BigBang_Unit_Shared {
    function test_removeCollateral_WhenContractIsPaused(uint256 collateralAmount)
        external
        whenContractIsPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        (Module[] memory modules, bytes[] memory calls) =
            _getRemoveCollateralData(collateralAmount, address(this), address(this));

        // **** Main BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);
    }

    function test_removeCollateral_WhenCalledForItself(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        (Module[] memory modules, bytes[] memory calls) =
            _getRemoveCollateralData(collateralAmount, address(this), address(mainBB));

        // **** Main BB market ****
        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        (modules, calls) = _getRemoveCollateralData(collateralAmount, address(this), address(secondaryBB));
        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        secondaryBB.execute(modules, calls, true);
    }

    function test_givenCalledForAValidSenderByItself_whenContractIsNotPaused_RevertWhen_ItsCalledWithoutAPosition(
        uint256 collateralAmount
    ) external whenContractIsNotPaused whenCollateralAmountIsValid(collateralAmount) {
        (Module[] memory modules, bytes[] memory calls) =
            _getRemoveCollateralData(collateralAmount, address(this), address(this));

        // it should revert
        // **** Main BB market ****
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        vm.expectRevert();
        secondaryBB.execute(modules, calls, true);
    }

    function test_givenCalledForAValidSenderByItself_whenUserHasBorrowed_RevertWhen_NotSolvent(
        uint256 addAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(addAmount)
        givenBorrowCapIsNotReachedYet
    {
        // **** Add collateral ****
        _addCollateral(addAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // **** Borrow ****
        borrowAmount = _boundBorrowAmount(borrowAmount, addAmount);
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        // **** Remove collateral ****
        uint256 removeShare = mainBB._userCollateralShare(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            _getRemoveCollateralData(removeShare, address(this), address(this));

        vm.expectRevert("Market: insolvent");
        mainBB.execute(modules, calls, true);
    }

    function test_givenCalledForAValidSenderByItself_whenUserHasBorrowed_whenSolvent_WhenCollateralIsRemovable(
        uint256 addAmount,
        uint256 borrowAmount,
        uint256 removeShare
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(addAmount)
        givenBorrowCapIsNotReachedYet
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, addAmount);

        // **** Main BB market ****
        _removeCollateral(addAmount, removeShare, borrowAmount, mainBB, address(this), address(this), address(this));

        // **** Secondary BB market ****
        _removeCollateral(
            addAmount, removeShare, borrowAmount, secondaryBB, address(this), address(this), address(this)
        );
    }

    function test_givenCalledForAValidSenderByItself_whenUserDoesNotHaveABorrowedPosition_WhenCollateralCanBeRemoved(
        uint256 addAmount,
        uint256 removeShare
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(addAmount)
        givenBorrowCapIsNotReachedYet
    {
        uint256 borrowAmount = 0;

        // **** Main BB market ****
        _removeCollateral(addAmount, removeShare, borrowAmount, mainBB, address(this), address(this), address(this));

        // **** Secondary BB market ****
        _removeCollateral(
            addAmount, removeShare, borrowAmount, secondaryBB, address(this), address(this), address(this)
        );
    }

    function test_whenItsCalledFromAnotherUser_WhenUserDoesNotHaveEnoughAllowance(uint256 addAmount)
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(addAmount)
        givenBorrowCapIsNotReachedYet
    {
        // **** Add collateral ****
        _addCollateral(addAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // **** Remove collateral ****
        uint256 removeShare = mainBB._userCollateralShare(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            _getRemoveCollateralData(removeShare, address(this), address(this));

        _resetPrank(userA);
        vm.expectRevert("Market: not approved");
        mainBB.execute(modules, calls, true);

        // it should revert with 'Market: not approved'
    }

    function test_whenItsCalledFromAnotherUser_whenUserHasBorrowed_whenUserHasBeenGivenAllowance_RevertWhen_NotSolventPosition(
        uint256 addAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(addAmount)
        givenBorrowCapIsNotReachedYet
    {
        // add collateral
        _addCollateral(addAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        borrowAmount = _boundBorrowAmount(borrowAmount, addAmount);
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        uint256 removeShare = mainBB._userCollateralShare(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            _getRemoveCollateralData(removeShare, address(this), address(this));

        mainBB.approveBorrow(userA, type(uint256).max);
        _resetPrank(userA);
        vm.expectRevert("Market: insolvent");
        mainBB.execute(modules, calls, true);
    }

    function test_whenItsCalledFromAnotherUser_whenUserHasBorrowed_whenUserHasBeenGivenAllowance_whenSolvent_WhenCollateralRemoved(
        uint256 addAmount,
        uint256 borrowAmount,
        uint256 removeShare
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(addAmount)
        givenBorrowCapIsNotReachedYet
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, addAmount);

        // **** Main BB market ****
        mainBB.approveBorrow(userA, type(uint256).max);
        _removeCollateral(addAmount, removeShare, borrowAmount, mainBB, userA, address(this), address(this));

        // **** Secondary BB market ****
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            address(this),
            address(secondaryBB),
            type(uint200).max,
            uint48(block.timestamp),
            secondaryBB._collateralId()
        );
        secondaryBB.approveBorrow(userA, type(uint256).max);
        _removeCollateral(addAmount, removeShare, borrowAmount, secondaryBB, userA, address(this), address(this));
    }

    function test_whenItsCalledFromAnotherUser_whenUserHasBeenGivenAllowance_whenSolvent_WhenCollateralIsRemoved(
        uint256 addAmount,
        uint256 removeShare
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(addAmount)
        givenBorrowCapIsNotReachedYet
    {
        // **** Main BB market ****
        mainBB.approveBorrow(userA, type(uint256).max);
        _removeCollateral(addAmount, removeShare, 0, mainBB, userA, address(this), address(this));

        // **** Secondary BB market ****
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            address(this),
            address(secondaryBB),
            type(uint200).max,
            uint48(block.timestamp),
            secondaryBB._collateralId()
        );
        secondaryBB.approveBorrow(userA, type(uint256).max);
        _removeCollateral(addAmount, removeShare, 0, secondaryBB, userA, address(this), address(this));
    }
}
