// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_removeCollateral is BigBang_Unit_Shared {
    function test_RevertWhen_RemoveCollateralIsCalledAndContractIsPaused() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);
        bb.updatePause(Market.PauseType.RemoveCollateral, true);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.removeCollateral(address(this), address(this), 1 ether);

        vm.expectRevert("Market: paused");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_RemoveCollateralIsCalledForTheContractItself() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.removeCollateral(address(bb), address(bb), 1 ether);

        vm.expectRevert("Market: cannot execute on itself");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_RemoveCollateralIsCalledAndUserIsNotSolvent() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        uint256 amount = 0.5 ether;
        uint256 share = yieldBox.toShare(bb._collateralId(), amount, false);
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.removeCollateral(address(this), address(this), share);
        vm.expectRevert("Market: insolvent");
        bb.execute(modules, calls, true);
    }

    function test_WhenRemoveCollateralIsCalledForSender() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        // remove when there is no borrow position
        uint256 amount = 0.05 ether;
        uint256 share = yieldBox.toShare(bb._collateralId(), amount, false);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.removeCollateral(address(this), address(this), share);

        uint256 userCollateralShareBefore = bb._userCollateralShare(address(this));
        uint256 totalCollateralShareBefore = bb._totalCollateralShare();
        uint256 ybBalanceOfMarketBefore = yieldBox.balanceOf(address(bb), bb._collateralId());
        bb.execute(modules, calls, true);
        uint256 userCollateralShareAfter = bb._userCollateralShare(address(this));
        uint256 totalCollateralShareAfter = bb._totalCollateralShare();
        uint256 ybBalanceOfMarketAfter = yieldBox.balanceOf(address(bb), bb._collateralId());

        assertGt(userCollateralShareBefore, userCollateralShareAfter);
        assertGt(totalCollateralShareBefore, totalCollateralShareAfter);
        assertGt(ybBalanceOfMarketBefore, ybBalanceOfMarketAfter);

        // remove when there is a borrow position
        _borrow(bb);

        (modules, calls) = marketHelper.removeCollateral(address(this), address(this), share);

        userCollateralShareBefore = bb._userCollateralShare(address(this));
        totalCollateralShareBefore = bb._totalCollateralShare();
        ybBalanceOfMarketBefore = yieldBox.balanceOf(address(bb), bb._collateralId());
        bb.execute(modules, calls, true);
        userCollateralShareAfter = bb._userCollateralShare(address(this));
        totalCollateralShareAfter = bb._totalCollateralShare();
        ybBalanceOfMarketAfter = yieldBox.balanceOf(address(bb), bb._collateralId());

        assertGt(userCollateralShareBefore, userCollateralShareAfter);
        assertGt(totalCollateralShareBefore, totalCollateralShareAfter);
        assertGt(ybBalanceOfMarketBefore, ybBalanceOfMarketAfter);
    }

    function test_RevertWhen_RemoveCollateralIsCalledForAnotherUserWithoutAllowedBorrowed() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        uint256 amount = 0.05 ether;
        uint256 share = yieldBox.toShare(bb._collateralId(), amount, false);
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.removeCollateral(address(this), address(this), share);
        vm.startPrank(userA);
        vm.expectRevert("Market: not approved");
        bb.execute(modules, calls, true);
        vm.stopPrank();
    }

    function test_WhenRemoveCollateralIsCalledForAnotherUserWithAllowedBorrowed() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        uint256 amount = 0.05 ether;
        uint256 share = yieldBox.toShare(bb._collateralId(), amount, false);
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.removeCollateral(address(this), address(this), share);

        bb.approveBorrow(address(userA), share);

        uint256 userCollateralShareBefore = bb._userCollateralShare(address(this));
        uint256 totalCollateralShareBefore = bb._totalCollateralShare();
        uint256 ybBalanceOfMarketBefore = yieldBox.balanceOf(address(bb), bb._collateralId());
        vm.prank(userA);
        bb.execute(modules, calls, true);
        uint256 userCollateralShareAfter = bb._userCollateralShare(address(this));
        uint256 totalCollateralShareAfter = bb._totalCollateralShare();
        uint256 ybBalanceOfMarketAfter = yieldBox.balanceOf(address(bb), bb._collateralId());

        assertGt(userCollateralShareBefore, userCollateralShareAfter);
        assertGt(totalCollateralShareBefore, totalCollateralShareAfter);
        assertGt(ybBalanceOfMarketBefore, ybBalanceOfMarketAfter);
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

    function _borrow(BigBang bb) private {
        uint256 borrowAmount = 0.5 ether;
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.borrow(address(this), address(this), borrowAmount);
        bb.execute(modules, calls, true);
    }
}
