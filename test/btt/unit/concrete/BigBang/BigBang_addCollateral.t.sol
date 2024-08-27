// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {Module} from "tap-utils/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_addCollateral is BigBang_Unit_Shared {
    modifier whenIterationsAreValid(uint256 iterations) {
        vm.assume(iterations > 0 && iterations < MAX_ITERATIONS);
        _;
    }

    function test_WhenContractIsPaused(uint256 collateralAmount)
        external
        whenContractIsPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        (Module[] memory modules, bytes[] memory calls) =
            _getCollateralData(collateralAmount, address(this), address(this), false);
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);

        (modules, calls) = _getCollateralData(collateralAmount, address(this), address(this), true);
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);
    }

    function test_GivenCalledForItself(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        (Module[] memory modules, bytes[] memory calls) =
            _getCollateralData(collateralAmount, address(mainBB), address(mainBB), false);

        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        mainBB.execute(modules, calls, true);

        // it should revert with 'Market: cannot execute on itself'
        (modules, calls) = _getCollateralData(collateralAmount, address(secondaryBB), address(secondaryBB), false);
        vm.expectRevert("Market: cannot execute on itself");
        secondaryBB.execute(modules, calls, true);

        // it should revert with 'Market: cannot execute on itself'
        (modules, calls) = _getCollateralData(collateralAmount, address(mainBB), address(mainBB), true);
        vm.expectRevert("Market: cannot execute on itself");
        mainBB.execute(modules, calls, true);

        // it should revert with 'Market: cannot execute on itself'
        (modules, calls) = _getCollateralData(collateralAmount, address(secondaryBB), address(secondaryBB), true);
        vm.expectRevert("Market: cannot execute on itself");
        secondaryBB.execute(modules, calls, true);
    }

    function test_RevertGiven_AmountIsTooLow(uint256 collateralAmount) external whenContractIsNotPaused {
        uint256 minCollateralAmount = mainBB._minCollateralAmount();
        vm.assume(collateralAmount > 0 && collateralAmount < minCollateralAmount);

        (Module[] memory modules, bytes[] memory calls) =
            _getCollateralData(collateralAmount, address(this), address(this), false);

        // min amount revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        // min amount revert
        vm.expectRevert();
        secondaryBB.execute(modules, calls, true);
    }

    function test_givenCalledForAValidSenderByItself_WhenCollateralIsNotSkimmed(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        uint256 iterations = 10;
        // **** Main BB market ****
        for (uint256 i; i < iterations; i++) {
            // already does the necessary checks
            _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);
        }

        // **** Secondary BB market ****
        for (uint256 i; i < iterations; i++) {
            // already does the necessary checks
            _addCollateral(
                collateralAmount, secondaryBB, address(this), address(this), address(this), address(this), false
            );
        }
    }

    function test_givenCalledForAValidSenderByItself_WhenCollateralIsSkimmed(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        uint256 iterations = 25;
        // **** Main BB market ****
        // already does the necessary checks
        for (uint256 i; i < iterations; i++) {
            _addCollateral(collateralAmount, mainBB, address(this), address(this), address(mainBB), address(this), true);
        }

        // **** Secondary BB market ****
        // already does the necessary checks
        for (uint256 i; i < iterations; i++) {
            _addCollateral(
                collateralAmount, secondaryBB, address(this), address(this), address(secondaryBB), address(this), true
            );
        }
    }

    function test_givenCalledFromAnotherUser_WhenUserDoesNotHaveEnoughAllowance(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        // deal collateral
        _spawnCollateral(collateralAmount, address(this));

        // approvals
        _approveForCollateral(address(this));

        // deposit to YieldBox for market
        uint256 share = yieldBox.toShare(mainBB._collateralId(), collateralAmount, false);
        _depositToYieldBox(mainBB._collateral(), mainBB._collateralId(), share, address(this), address(this));

        (Module[] memory modules, bytes[] memory calls) =
            _getCollateralData(collateralAmount, address(this), address(this), false);

        // it should revert with 'Market: not approved'
        _resetPrank(userA);
        vm.expectRevert("Market: not approved");
        mainBB.execute(modules, calls, true);
    }

    function test_givenCalledFromAnotherUser_GivenCollateralIsNotSkimmed(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        // **** Main BB market ****
        uint256 share = yieldBox.toShare(mainBB._collateralId(), collateralAmount, false);
        _approveBorrow(mainBB, address(this), userA, share);
        _addCollateral(collateralAmount, mainBB, userA, address(this), address(this), address(this), false);

        // **** Secondary BB market ****
        share = yieldBox.toShare(secondaryBB._collateralId(), collateralAmount, false);
        _approveBorrow(secondaryBB, address(this), userA, share);
        _addCollateral(collateralAmount, secondaryBB, userA, address(this), address(this), address(this), false);
    }

    function test_givenCalledFromAnotherUser_GivenCollateralIsSkimmed(uint256 collateralAmount)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
    {
        // **** Main BB market ****
        uint256 share = yieldBox.toShare(mainBB._collateralId(), collateralAmount, false);
        _approveBorrow(mainBB, address(this), userA, share);
        _addCollateral(collateralAmount, mainBB, userA, address(this), address(mainBB), address(this), true);

        // **** Secondary BB market ****
        share = yieldBox.toShare(secondaryBB._collateralId(), collateralAmount, false);
        _approveBorrow(secondaryBB, address(this), userA, share);
        _addCollateral(collateralAmount, secondaryBB, userA, address(this), address(secondaryBB), address(this), true);
    }
}
