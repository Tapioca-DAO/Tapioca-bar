// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_borrow is BigBang_Unit_Shared {
    function test_RevertWhen_BorrowIsCalledAndContractIsPaused() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);
        bb.updatePause(Market.PauseType.Borrow, true);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.borrow(address(this), address(this), 1 ether);

        vm.expectRevert("Market: paused");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_BorrowIsCalledForTheContractItself() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.borrow(address(bb), address(bb), 1 ether);
        vm.expectRevert("Market: cannot execute on itself");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_BorrowIsCalledWithAmountSmallerThanMinBorrowAmount() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.borrow(address(bb), address(bb), 100);
        vm.expectRevert();
        bb.execute(modules, calls, true);
    }

    function test_WhenBorrowIsCalledForSender() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        // borrow too much
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.borrow(address(this), address(this), 99999999 ether);
        vm.expectRevert("Market: insolvent");
        bb.execute(modules, calls, true);

        // borrow using main market
        uint256 borrowAmount = 0.5 ether;
        (modules, calls) = marketHelper.borrow(address(this), address(this), borrowAmount);
        bb.execute(modules, calls, true);

        uint256 borrowPart = bb._userBorrowPart(address(this));
        assertGt(borrowPart, borrowAmount); //opening fee

        uint256 feeAmount = bb.computeVariableOpeningFee(borrowAmount);
        uint256 borrowedWithFee = borrowAmount + feeAmount;
        assertEq(borrowPart, borrowedWithFee); //taking opening fee into account

        uint256 usdoSupply = usdo.totalSupply();
        assertEq(usdoSupply, borrowAmount);

        uint256 assetYbMarketBalance = yieldBox.balanceOf(address(bb), usdoId);
        assertEq(assetYbMarketBalance, 0);

        uint256 assetYbUserBalance = yieldBox.amountOf(address(this), usdoId);
        assertEq(assetYbUserBalance, borrowAmount);

        // borrow using secondary marke
        BigBang secondaryBB = BigBang(payable(_registerSecondaryDefaultBigBang()));
        _setSecondaryBigBangDefaults(address(secondaryBB));

        _addCollateral(secondaryBB);
        secondaryBB.execute(modules, calls, true);

        borrowPart = secondaryBB._userBorrowPart(address(this));
        assertGt(borrowPart, borrowAmount); //opening fee

        feeAmount = secondaryBB.computeVariableOpeningFee(borrowAmount);
        borrowedWithFee = borrowAmount + feeAmount;
        assertEq(borrowPart, borrowedWithFee); //taking opening fee into account

        usdoSupply = usdo.totalSupply();
        assertEq(usdoSupply, borrowAmount * 2);

        assetYbMarketBalance = yieldBox.balanceOf(address(bb), usdoId);
        assertEq(assetYbMarketBalance, 0);

        assetYbUserBalance = yieldBox.amountOf(address(this), usdoId);
        assertEq(assetYbUserBalance, borrowAmount * 2);
    }

    function test_RevertWhen_BorrowIsCalledForAnotherUserWithoutAllowedBorrowed() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        uint256 borrowAmount = 0.5 ether;
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.borrow(address(this), address(this), borrowAmount);

        vm.startPrank(userA);
        vm.expectRevert("Market: not approved");
        bb.execute(modules, calls, true);
        vm.stopPrank();
    }

    function test_WhenBorrowIsCalledForAnotherUserWithAllowedBorrowed() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        uint256 borrowAmount = 0.5 ether;
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.borrow(address(this), address(this), borrowAmount);

        bb.approveBorrow(address(userA), type(uint256).max);

        vm.prank(userA);
        bb.execute(modules, calls, true);

        uint256 borrowPart = bb._userBorrowPart(address(this));
        assertGt(borrowPart, borrowAmount); //opening fee

        uint256 feeAmount = bb.computeVariableOpeningFee(borrowAmount);
        uint256 borrowedWithFee = borrowAmount + feeAmount;
        assertEq(borrowPart, borrowedWithFee); //taking opening fee into account

        uint256 usdoSupply = usdo.totalSupply();
        assertEq(usdoSupply, borrowAmount);

        uint256 assetYbMarketBalance = yieldBox.balanceOf(address(bb), usdoId);
        assertEq(assetYbMarketBalance, 0);

        uint256 assetYbUserBalance = yieldBox.amountOf(address(this), usdoId);
        assertEq(assetYbUserBalance, borrowAmount);
    }

    function _addCollateral(BigBang bb) private {
        // vars
        IERC20 collateral = IERC20(bb._collateral());
        uint256 collateralId = bb._collateralId();

        // deal amounts
        uint256 amount = 1 ether;
        deal(address(collateral), address(this), amount);

        // approvals
        collateral.approve(address(yieldBox), type(uint256).max);
        collateral.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(address(bb), true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(1155, address(yieldBox), collateralId, address(bb), type(uint200).max, uint48(block.timestamp));

        uint256 share = yieldBox.toShare(collateralId, amount, false);
        yieldBox.depositAsset(collateralId, address(this), address(this), 0, share);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.addCollateral(address(this), address(this), false, 0, share);
        bb.execute(modules, calls, true);
    }
}
