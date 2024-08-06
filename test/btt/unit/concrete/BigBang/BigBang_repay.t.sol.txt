// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

// dependencies
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

import "forge-std/console.sol";

contract BigBang_repay is BigBang_Unit_Shared {
    function test_RevertWhen_RepayIsCalledAndContractIsPaused() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);
        bb.updatePause(Market.PauseType.Repay, true);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.repay(address(this), address(this), false, 1 ether);

        vm.expectRevert("Market: paused");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_RepayIsCalledForTheContractItself() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.repay(address(bb), address(bb), false, 1 ether);
        vm.expectRevert("Market: cannot execute on itself");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_RepayIsCalledForNoPosition() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.repay(address(this), address(this), false, 1 ether);

        vm.expectRevert();
        bb.execute(modules, calls, true);
    }

    function test_WhenRepayIsCalledForSender() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.repay(address(this), address(this), false, 1 ether);

        vm.expectRevert(); //no approvals
        bb.execute(modules, calls, true);

        pearlmit.approve(
            1155, address(yieldBox), bb._assetId(), address(bb), type(uint200).max, uint48(block.timestamp)
        );

        vm.expectRevert(); //no funds for repayment
        bb.execute(modules, calls, true);

        vm.roll(10000);
        skip(86400 * 10);

        // prepare for repay by depositing into YieldBox
        uint256 amount = 0.5 ether;

        _addToYieldBox(address(bb), bb._asset(), bb._assetId(), amount);

        uint256 usdoSupplyBefore = usdo.totalSupply();
        uint256 userBorrowPartBefore = bb._userBorrowPart(address(this));
        Rebase memory totalBorrowBefore = bb._totalBorrow();
        (modules, calls) = marketHelper.repay(address(this), address(this), false, amount);
        bb.execute(modules, calls, true);
        uint256 userBorrowPartAfter = bb._userBorrowPart(address(this));
        uint256 usdoSupplyAfter = usdo.totalSupply();
        Rebase memory totalBorrowAfter = bb._totalBorrow();

        assertGt(userBorrowPartBefore, userBorrowPartAfter);
        assertGt(usdoSupplyBefore, usdoSupplyAfter);
        assertGt(totalBorrowBefore.base, totalBorrowAfter.base);
        assertGt(totalBorrowBefore.elastic, totalBorrowAfter.elastic);
    }

    function test_RevertWhen_RepayIsCalledForAnotherUserWithoutAllowedLend() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        pearlmit.approve(
            1155, address(yieldBox), bb._assetId(), address(bb), type(uint200).max, uint48(block.timestamp)
        );

        vm.roll(10000);
        skip(86400 * 10);

        // prepare for repay by depositing into YieldBox
        uint256 amount = 0.5 ether;

        _addToYieldBox(address(bb), bb._asset(), bb._assetId(), amount);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.repay(address(this), address(this), false, amount);
        vm.startPrank(userA);
        vm.expectRevert("Market: not approved");
        bb.execute(modules, calls, true);
        vm.stopPrank();
    }

    function test_WhenRepayIsCalledForAnotherUserWithAllowedLend() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        pearlmit.approve(
            1155, address(yieldBox), bb._assetId(), address(bb), type(uint200).max, uint48(block.timestamp)
        );

        vm.roll(10000);
        skip(86400 * 10);

        // prepare for repay by depositing into YieldBox
        uint256 amount = 0.5 ether;

        _addToYieldBox(address(bb), bb._asset(), bb._assetId(), amount);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.repay(address(this), address(this), false, amount);

        bb.approve(address(userA), type(uint256).max);
        vm.prank(userA);
        bb.execute(modules, calls, true);
    }

    function _addToYieldBox(address _bb, address _asset, uint256 _assetId, uint256 _amount) private {
        deal(_asset, address(this), _amount);

        usdo.approve(address(yieldBox), type(uint256).max);
        usdo.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(_bb, true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(1155, address(yieldBox), _assetId, _bb, type(uint200).max, uint48(block.timestamp));
        yieldBox.depositAsset(_assetId, address(this), address(this), _amount, 0);

        usdo.setMinterStatus(address(this), true);
        usdo.mint(address(this), _amount);
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
