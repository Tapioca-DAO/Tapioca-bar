// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// dependencies
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {MarketLiquidatorReceiverMock_test} from "../../../mocks/MarketLiquidatorReceiverMock_test.sol";
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";

import {Market} from "contracts/markets/Market.sol";

contract BigBang_liquidate is BigBang_Unit_Shared {
    MarketLiquidatorReceiverMock_test liquidatorMock;

    function setUp() public override {
        super.setUp();
        liquidatorMock = new MarketLiquidatorReceiverMock_test(IERC20(address(usdo)));
    }

    function test_RevertWhen_LiquidateIsCalledForPausedContract() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);
        bb.updatePause(Market.PauseType.Liquidation, true);

        address[] memory users = new address[](1);
        users[0] = address(this);

        uint256[] memory borrowParts = new uint256[](1);
        borrowParts[0] = 0;

        uint256[] memory minLiquidationBonuses = new uint256[](1);
        minLiquidationBonuses[0] = 1e4;

        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
        receivers[0] = IMarketLiquidatorReceiver(address(liquidatorMock));

        bytes[] memory receiverData = new bytes[](1);
        receiverData[0] = abi.encode(0);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
        vm.expectRevert("Market: paused");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateIsCalledForNoUsers() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory users = new address[](0);
        uint256[] memory borrowParts = new uint256[](0);
        uint256[] memory minLiquidationBonuses = new uint256[](0);
        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](0);
        bytes[] memory receiverData = new bytes[](0);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);

        // NothingToLiquidate
        vm.expectRevert();
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateIsCalledForDifferentArrays() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory users = new address[](1);
        users[0] = address(this);
        uint256[] memory borrowParts = new uint256[](0);
        uint256[] memory minLiquidationBonuses = new uint256[](0);
        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](0);
        bytes[] memory receiverData = new bytes[](0);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);

        // LengthMismatch
        vm.expectRevert();
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateIsCalledForSolventUsers() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        uint256 amount = 0.25 ether;

        deal(address(bb._asset()), address(liquidatorMock), amount);

        address[] memory users = new address[](1);
        users[0] = address(this);

        uint256[] memory borrowParts = new uint256[](1);
        borrowParts[0] = amount;

        uint256[] memory minLiquidationBonuses = new uint256[](1);
        minLiquidationBonuses[0] = 1e4;

        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
        receivers[0] = IMarketLiquidatorReceiver(address(liquidatorMock));

        bytes[] memory receiverData = new bytes[](1);
        receiverData[0] = abi.encode(amount);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);

        // LengthMismatch
        vm.expectRevert("BB: no users found");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateIsCalledAndReturnedShareIsLessThanBorrowShare() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        uint256 oracleRate = oracle.rate();
        oracle.set(oracleRate * 2);

        uint256 amount = 0.4 ether;

        deal(address(bb._asset()), address(liquidatorMock), 0.00005 ether);

        address[] memory users = new address[](1);
        users[0] = address(this);

        uint256[] memory borrowParts = new uint256[](1);
        borrowParts[0] = amount;

        uint256[] memory minLiquidationBonuses = new uint256[](1);
        minLiquidationBonuses[0] = 1e4;

        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
        receivers[0] = IMarketLiquidatorReceiver(address(liquidatorMock));

        bytes[] memory receiverData = new bytes[](1);
        receiverData[0] = abi.encode(0.00005 ether);

        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);

        // OnCollateralReceiverFailed
        vm.expectRevert();
        bb.execute(modules, calls, true);
    }

    function test_WhenLiquidateIsCalledWithValidParameters() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        uint256 oracleRate = oracle.rate();
        oracle.set(oracleRate * 2);

        uint256 amount = 0.4 ether;

        deal(address(bb._asset()), address(liquidatorMock), amount);

        address[] memory users = new address[](1);
        users[0] = address(this);

        uint256[] memory borrowParts = new uint256[](1);
        borrowParts[0] = amount;

        uint256[] memory minLiquidationBonuses = new uint256[](1);
        minLiquidationBonuses[0] = 1e4;

        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
        receivers[0] = IMarketLiquidatorReceiver(address(liquidatorMock));

        bytes[] memory receiverData = new bytes[](1);
        receiverData[0] = abi.encode(amount);

        uint256 userBorrowPartBefore = bb._userBorrowPart(address(this));
        uint256 userCollateralShareBefore = bb._userCollateralShare(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);

        bb.execute(modules, calls, true);

        uint256 userBorrowPartAfter = bb._userBorrowPart(address(this));
        uint256 userCollateralShareAfter = bb._userCollateralShare(address(this));

        assertGt(userBorrowPartBefore, userBorrowPartAfter);
        assertGt(userCollateralShareBefore, userCollateralShareAfter);
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
        uint256 borrowAmount = 0.4 ether;
        (Module[] memory modules, bytes[] memory calls) =
            marketHelper.borrow(address(this), address(this), borrowAmount);
        bb.execute(modules, calls, true);
    }
}
