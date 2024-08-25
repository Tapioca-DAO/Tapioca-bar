// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {LeverageExecutorMock_test} from "../../../mocks/LeverageExecutorMock_test.sol";

// dependencies
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_sellCollateral is BigBang_Unit_Shared {
    LeverageExecutorMock_test public leverageExecutor;

    function setUp() public override {
        super.setUp();

        leverageExecutor = new LeverageExecutorMock_test();
    }

    function test_RevertWhen_SellCollateralIsCalledAndContractIsPaused() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);
        bb.updatePause(Market.PauseType.LeverageSell, true);

        bytes memory leverageData = abi.encode(1000, "");
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.sellCollateral(address(this), 1 ether, leverageData);

        vm.expectRevert("Market: paused");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_SellCollateralIsCalledForTheContractItself() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        bytes memory leverageData = abi.encode(1000, "");
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.sellCollateral(address(bb), 1 ether, leverageData);

        vm.expectRevert("Market: cannot execute on itself");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_SellCollateralIsCalledAndLeverageExecutorIsAddress0() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        bytes memory leverageData = abi.encode(1000, "");
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.sellCollateral(address(this), 1 ether, leverageData);

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(Market.setLeverageExecutor.selector, ILeverageExecutor(address(0)));
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        // LeverageExecutorNotValid
        vm.expectRevert();
        bb.execute(modules, calls, true);
    }

    function test_WhenSellCollateralIsCalledForSender() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        _setLeverageExecutor(bb);

        // fill leverage executor
        uint256 amount = 0.5 ether;
        deal(address(bb._asset()), address(leverageExecutor), amount);

        _addToYieldBox(address(bb), bb._collateral(), bb._collateralId(), amount);

        bytes memory leverageData = abi.encode(amount);
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.sellCollateral(address(this), amount, leverageData);

        pearlmit.approve(
            1155, address(yieldBox), bb._assetId(), address(bb), type(uint200).max, uint48(block.timestamp)
        ); // for repayment

        uint256 userBorrowPartBefore = bb._userBorrowPart(address(this));
        uint256 userCollateralBefore = bb._userCollateralShare(address(this));
        bb.execute(modules, calls, true);
        uint256 userBorrowPartAfter = bb._userBorrowPart(address(this));
        uint256 userCollateralAfter = bb._userCollateralShare(address(this));

        assertLt(userBorrowPartAfter, userBorrowPartBefore);
        assertLt(userCollateralAfter, userCollateralBefore);
    }

    function test_RevertWhen_SellCollateralIsCalledForAnotherUserWithoutAllowedLend() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        _setLeverageExecutor(bb);

        // fill leverage executor
        uint256 amount = 0.5 ether;
        deal(address(bb._asset()), address(leverageExecutor), amount);

        _addToYieldBox(address(bb), bb._collateral(), bb._collateralId(), amount);

        bytes memory leverageData = abi.encode(amount);
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.sellCollateral(address(this), amount, leverageData);

        vm.startPrank(userA);
        vm.expectRevert("Market: not approved");
        bb.execute(modules, calls, true);
        vm.stopPrank();
    }

    function test_WhenSellCollateralIsCalledForAnotherUserWithAllowedLend() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        _setLeverageExecutor(bb);

        // fill leverage executor
        uint256 amount = 0.5 ether;
        deal(address(bb._asset()), address(leverageExecutor), amount);

        _addToYieldBox(address(bb), bb._collateral(), bb._collateralId(), amount);

        bytes memory leverageData = abi.encode(amount);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.sellCollateral(address(this), amount, leverageData);
        pearlmit.approve(
            1155, address(yieldBox), bb._assetId(), address(bb), type(uint200).max, uint48(block.timestamp)
        ); // for repayment

        bb.approveBorrow(address(userA), type(uint256).max);

        uint256 userBorrowPartBefore = bb._userBorrowPart(address(this));
        uint256 userCollateralBefore = bb._userCollateralShare(address(this));
        uint256 marketYbBalanceBefore = yieldBox.balanceOf(address(bb), bb._collateralId());
        uint256 userYbBalanceBefore = yieldBox.balanceOf(address(this), bb._collateralId());

        vm.prank(userA);
        bb.execute(modules, calls, true);

        uint256 userBorrowPartAfter = bb._userBorrowPart(address(this));
        uint256 userCollateralAfter = bb._userCollateralShare(address(this));
        uint256 marketYbBalanceAfter = yieldBox.balanceOf(address(bb), bb._collateralId());
        uint256 userYbBalanceAfter = yieldBox.balanceOf(address(this), bb._collateralId());

        assertLt(userBorrowPartAfter, userBorrowPartBefore);
        assertLt(userCollateralAfter, userCollateralBefore);
        assertLt(marketYbBalanceAfter, marketYbBalanceBefore);
        assertEq(userYbBalanceAfter, userYbBalanceBefore);
    }

    function _setLeverageExecutor(BigBang bb) private {
        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] =
            abi.encodeWithSelector(Market.setLeverageExecutor.selector, ILeverageExecutor(address(leverageExecutor)));
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);
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

    function _addToYieldBox(address _bb, address _asset, uint256 _assetId, uint256 _amount) private {
        deal(_asset, address(this), _amount);

        IERC20(_asset).approve(address(yieldBox), type(uint256).max);
        IERC20(_asset).approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(_bb, true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(1155, address(yieldBox), _assetId, _bb, type(uint200).max, uint48(block.timestamp));
        yieldBox.depositAsset(_assetId, address(this), address(this), _amount, 0);

        usdo.setMinterStatus(address(this), true);
        usdo.mint(address(this), _amount);
    }
}
