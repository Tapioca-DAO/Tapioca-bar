// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_addCollateral is BigBang_Unit_Shared {
    function test_RevertWhen_AddCollateralIsCalledAndContractIsPaused() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);
        bb.updatePause(Market.PauseType.AddCollateral, true);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.addCollateral(address(this), address(this), false, 1 ether, 0);

        vm.expectRevert("Market: paused");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_AddCollateralIsCalledForTheContractItself() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.addCollateral(address(this), address(bb), false, 1 ether, 0);
        vm.expectRevert("Market: cannot execute on itself");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_AddCollateralIsCalledWithAmountSmallerThanMinCollateralAmount() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.addCollateral(address(this), address(this), false, 100, 0);
        vm.expectRevert();
        bb.execute(modules, calls, true);
    }

    function test_WhenAddCollateralIsCalledForSender() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

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

        uint256 resultedCollateral = bb._userCollateralShare(address(this));
        assertEq(resultedCollateral, share);

        uint256 totalCollateralShare = bb._totalCollateralShare();
        assertEq(totalCollateralShare, share);

        uint256 bbYieldBoxBalance = yieldBox.balanceOf(address(bb), mainTokenId);
        assertEq(bbYieldBoxBalance, share);
    }

    function test_RevertWhen_AddCollateralIsCalledForAnotherUserWithoutAllowedBorrowed() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

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

        vm.startPrank(userA);
        vm.expectRevert("Market: not approved");
        bb.execute(modules, calls, true);
        vm.stopPrank();
    }

    function test_WhenAddCollateralIsCalledForAnotherUserWithAllowedBorrowed() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

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

        bb.approveBorrow(address(userA), share);
        vm.startPrank(userA);
        bb.execute(modules, calls, true);
        vm.stopPrank();
    }
}
