// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_repay is BigBang_Unit_Shared {
    function test_repay_WhenContractIsPaused(uint256 repayPart) external whenContractIsPaused {
        (Module[] memory modules, bytes[] memory calls) = _getRepayData(repayPart, address(this), address(this));

        // **** Main BB market ****
        // it should revert with 'Market: paused'
        vm.expectRevert("Market: paused");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        vm.expectRevert("Market: paused");
        secondaryBB.execute(modules, calls, true);
    }

    function test_repay_WhenCalledForItself(uint256 repayPart) external whenContractIsNotPaused {
        // it should revert with 'Market: cannot execute on itself'

        (Module[] memory modules, bytes[] memory calls) = _getRepayData(repayPart, address(mainBB), address(mainBB));

        // **** Main BB market ****
        vm.expectRevert("Market: cannot execute on itself");
        mainBB.execute(modules, calls, true);

        // **** Secondary BB market ****
        (modules, calls) = _getRepayData(repayPart, address(secondaryBB), address(secondaryBB));
        vm.expectRevert("Market: cannot execute on itself");
        secondaryBB.execute(modules, calls, true);
    }

    function test_repay_givenCalledForAValidSenderByItself_RevertWhen_CalledWithoutAPosition(uint256 repayPart)
        external
        whenContractIsNotPaused
    {
        vm.assume(repayPart > 0 && repayPart < SMALL_AMOUNT);

        (Module[] memory modules, bytes[] memory calls) = _getRepayData(repayPart, address(this), address(this));
        //             │   │   │   └─ ← [Revert] NothingToRepay()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        // it should revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_repay_givenCalledForAValidSenderByItself_whenUserHasABorrowedPosition_WhenOracleFailsToFetchTheLatestPrices(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 repayPart
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
        whenApprovedViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            mainBB._assetId(),
            address(this),
            address(mainBB),
            type(uint200).max,
            uint48(block.timestamp)
        )
    {
        // **** Add collateral ****
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // **** Borrow ****
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        // **** Borrow ****
        repayPart = _boundRepayAmount(repayPart, mainBB);
        (Module[] memory modules, bytes[] memory calls) = _getRepayData(repayPart, address(this), address(this));

        oracle.setSuccess(false);

        uint256 userBorrowPartBefore = mainBB._userBorrowPart(address(this));
        // it should use the cached rates
        // it should continue with the repayment
        mainBB.execute(modules, calls, true);

        uint256 userBorrowPartAfter = mainBB._userBorrowPart(address(this));

        assertGt(userBorrowPartBefore, userBorrowPartAfter);
    }

    function test_repay_givenCalledForAValidSenderByItself_whenUserHasABorrowedPosition_RevertWhen_UserDoesntHaveEnoughAssetsInYieldBox(
        uint256 collateralAmount,
        uint256 borrowAmount
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
        whenApprovedViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            mainBB._assetId(),
            address(this),
            address(mainBB),
            type(uint200).max,
            uint48(block.timestamp)
        )
    {
        // **** Add collateral ****
        _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

        // **** Borrow ****
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        uint256 repayPart = mainBB._userBorrowPart(address(this));
        (Module[] memory modules, bytes[] memory calls) = _getRepayData(repayPart, address(this), address(this));
        // it should revert
        //         │   │   │   └─ ← [Revert] TransferFailed()
        // │   │   └─ ← [Revert] EvmError: Revert
        // │   └─ ← [Revert] EvmError: Revert
        vm.expectRevert();
        mainBB.execute(modules, calls, true);
    }

    function test_repay_givenCalledForAValidSenderByItself_whenUserHasABorrowedPosition_WhenUserDepositedAssetsIntoYieldBoxForRepayment(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 repayPart
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        // **** Main BB ****
        _repay(collateralAmount, borrowAmount, repayPart, mainBB, address(this), address(this), address(this));

        // **** Secondary BB ****
        _repay(collateralAmount, borrowAmount, repayPart, secondaryBB, address(this), address(this), address(this));

        // it should emit 'ReaccruedMarkets'
        // it should emit 'LogAccrue'
        // it should decrease 'userBorrowPart'
        // it should decrease 'totalBorrow.base'
        // it should decrease 'totalBorrow.elastic'
        // it should burn asset's supply
        // it should emit 'LogRepay'
    }

    function test_repay_whenCalledFromAnotherUser_WhenUserDoesNotHaveEnoughAllowance(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 repayPart
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

        // it should revert with 'Market: not approved'
        repayPart = _boundRepayAmount(repayPart, mainBB);
        (Module[] memory modules, bytes[] memory calls) = _getRepayData(repayPart, address(this), address(this));
        _resetPrank(userA);
        vm.expectRevert("Market: not approved");
        mainBB.execute(modules, calls, true);
    }

    function test_repay_whenCalledFromAnotherUser_WhenUserHasAllowance(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 repayPart
    )
        external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        givenBorrowCapIsNotReachedYet
    {
        // **** Main BB ****
        mainBB.approve(userA, type(uint256).max);
        _repay(collateralAmount, borrowAmount, repayPart, mainBB, userA, address(this), address(this));

        // **** Secondary BB ****
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
        secondaryBB.approve(userA, type(uint256).max);
        _repay(collateralAmount, borrowAmount, repayPart, secondaryBB, userA, address(this), address(this));
    }
}
