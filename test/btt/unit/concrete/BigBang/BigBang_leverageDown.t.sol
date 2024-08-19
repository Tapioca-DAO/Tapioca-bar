// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_sellCollateral is BigBang_Unit_Shared {
    function test_sellCollateral_RevertWhen_WhenContractIsPaused(uint256 collateralAmount, uint256 borrowAmount)
        external
        whenContractIsPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        uint256 leverageAmount = SMALL_AMOUNT;

        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(this));
        // **** Main BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);
    }

    function test_sellCollateral_RevertWhen_WhenCalledForItself(uint256 collateralAmount, uint256 borrowAmount)
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        uint256 leverageAmount = SMALL_AMOUNT;

        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(mainBB));
        // **** Main BB market ****
        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        (modules, calls) = _getLeverageDownData(leverageAmount, address(secondaryBB));
        // it should revert with 'Market: cannot execute on itself'
        vm.expectRevert("Market: cannot execute on itself");
        secondaryBB.execute(modules, calls, true);
    }

    function test_sellCollateral_RevertWhen_SellCollateralIsCalledAndLeverageExecutorIsAddressZero(
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
        uint256 leverageAmount = SMALL_AMOUNT;

        // **** Main BB market ****
        _setLeverageExecutor(address(0), mainBB);
        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(this));
        // it should revert
        //         │   │   │   └─ ← [Revert] LeverageExecutorNotValid()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        _setLeverageExecutor(address(0), secondaryBB);
        // it should revert
        //         │   │   │   └─ ← [Revert] LeverageExecutorNotValid()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        secondaryBB.execute(modules, calls, true);
    }

    function test_RevertWhen_whenItsCalledForAValidSenderByItself_TheresNoApproval(
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

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageDownAmount(leverageAmount, mainBB);

        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(this));
        //         │   │   │   │   └─ ← [Revert] PermitC__ApprovalTransferPermitExpiredOrUnset()
        // │   │   │   └─ ← [Revert] PermitC__ApprovalTransferPermitExpiredOrUnset()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);

        // **** SecondaryBB BB market ****
        // add collateral
        _addCollateral(collateralAmount, secondaryBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, secondaryBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageDownAmount(leverageAmount, secondaryBB);

        (modules, calls) = _getLeverageDownData(leverageAmount, address(this));
        //         │   │   │   │   └─ ← [Revert] PermitC__ApprovalTransferPermitExpiredOrUnset()
        // │   │   │   └─ ← [Revert] PermitC__ApprovalTransferPermitExpiredOrUnset()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_RevertWhen_whenItsCalledForAValidSenderByItself_LeverageExecutorReturnsAmountZero(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenHasLeverageDownApproval(address(this))
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        leverageExecutor.setReturnZero(true);

        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageDownAmount(leverageAmount, mainBB);
        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(this));
        // it should revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_WhenObtainedSharesAreGreaterThanBorrowedParts(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenHasLeverageDownApproval(address(this))
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        _leverageDown(
            collateralAmount, borrowAmount, leverageAmount, mainBB, address(this), address(this), address(this), true
        );

        // **** Secondary BB market ****
        _leverageDown(
            collateralAmount,
            borrowAmount,
            leverageAmount,
            secondaryBB,
            address(this),
            address(this),
            address(this),
            true
        );
    }

    function test_WhenObtainedSharesAreLessThanTheFullPosition(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenHasLeverageDownApproval(address(this))
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        _leverageDown(
            collateralAmount, borrowAmount, leverageAmount, mainBB, address(this), address(this), address(this), false
        );

        // **** Secondary BB market ****
        _leverageDown(
            collateralAmount,
            borrowAmount,
            leverageAmount,
            secondaryBB,
            address(this),
            address(this),
            address(this),
            false
        );
    }

    function test_givenCalledFromAnotherUser_WhenUserDoesNotHaveEnoughAllowance(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        whenHasLeverageDownApproval(address(this))
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageDownAmount(leverageAmount, mainBB);
        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(this));

        // it should revert with 'Market: not approved'
        _resetPrank(userA);
        vm.expectRevert("Market: not approved");
        mainBB.execute(modules, calls, true);
    }

    function test_givenCalledFromAnotherUser_whenUserHasBeenGivenAllowance_RevertWhen_LeverageExecutorReturnsAmountZero(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        whenHasLeverageDownApproval(address(this))
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        // add collateral
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // borrow
        // already does the necessary checks
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        leverageAmount = _boundLeverageDownAmount(leverageAmount, mainBB);

        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(this));
        leverageExecutor.setReturnZero(true);
        mainBB.approveBorrow(address(userA), type(uint256).max);

        _resetPrank(userA);
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_givenCalledFromAnotherUser_whenUserHasBeenGivenAllowance_WhenObtainedSharesAreMoreThanBorrowedParts(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        whenHasLeverageDownApproval(address(this))
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        mainBB.approveBorrow(address(userA), type(uint256).max);
        _leverageDown(collateralAmount, borrowAmount, leverageAmount, mainBB, userA, address(this), address(this), true);

        // **** Secondary BB market ****
        // re-approve for the secondary market as pearlmit expiration was hit
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            address(this),
            address(secondaryBB),
            type(uint200).max,
            uint48(block.timestamp),
            secondaryBB._assetId()
        );
        secondaryBB.approveBorrow(address(userA), type(uint256).max);
        _leverageDown(
            collateralAmount, borrowAmount, leverageAmount, secondaryBB, userA, address(this), address(this), true
        );
    }

    function test_givenCalledFromAnotherUser_whenUserHasBeenGivenAllowance_WhenObtainedSharesAreLessThanTheEntirePosition(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount
    )
        external
        whenContractIsNotPaused
        whenHasLeverageDownApproval(address(this))
        whenOracleRateIsEth
        whenAssetOracleRateIsAfterMin
        whenCollateralAmountIsValid(collateralAmount)
    {
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);

        // **** Main BB market ****
        mainBB.approveBorrow(address(userA), type(uint256).max);
        _leverageDown(
            collateralAmount, borrowAmount, leverageAmount, mainBB, userA, address(this), address(this), false
        );

        // **** Secondary BB market ****
        // re-approve for the secondary market as pearlmit expiration was hit
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            address(this),
            address(secondaryBB),
            type(uint200).max,
            uint48(block.timestamp),
            secondaryBB._assetId()
        );
        secondaryBB.approveBorrow(address(userA), type(uint256).max);
        _leverageDown(
            collateralAmount, borrowAmount, leverageAmount, secondaryBB, userA, address(this), address(this), false
        );
    }
}
