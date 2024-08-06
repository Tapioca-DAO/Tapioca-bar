// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// dependencies
import {MarketLiquidatorReceiverMock_test} from "../../../mocks/MarketLiquidatorReceiverMock_test.sol";
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_liquidateBadDebt is BigBang_Unit_Shared {
    MarketLiquidatorReceiverMock_test liquidatorMock;

    function setUp() public override {
        super.setUp();
        liquidatorMock = new MarketLiquidatorReceiverMock_test(IERC20(address(usdo)));
    }

    function test_RevertWhen_LiquidateBadDebtIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(
            address(this), address(this), address(this), IMarketLiquidatorReceiver(address(liquidatorMock)), "", false
        );
        vm.expectRevert("Ownable: caller is not the owner");
        bb.execute(modules, calls, true);
    }

    function test_RevertWhen_LiquidateBadDebtIsCalledAndFromIsNotWhitelisted() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(
            address(this), address(userA), address(this), IMarketLiquidatorReceiver(address(liquidatorMock)), "", false
        );

        bytes memory badDebtCall = abi.encodeWithSelector(BigBang.execute.selector, modules, calls, true);

        address[] memory mc = new address[](1);
        mc[0] = address(bb);

        bytes[] memory data = new bytes[](1);
        data[0] = badDebtCall;
        // NotAuthorized
        vm.expectRevert();
        penrose.executeMarketFn(mc, data, true);
    }

    function test_RevertWhen_LiquidateBadDebtIsCalledAndRequiredCollateralIsLessThanCollateralShare() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        cluster.updateContract(0, address(userA), true);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(
            address(this), address(userA), address(this), IMarketLiquidatorReceiver(address(liquidatorMock)), "", false
        );

        bytes memory badDebtCall = abi.encodeWithSelector(BigBang.execute.selector, modules, calls, true);

        address[] memory mc = new address[](1);
        mc[0] = address(bb);

        bytes[] memory data = new bytes[](1);
        data[0] = badDebtCall;
        // ForbiddenAction
        vm.expectRevert();
        penrose.executeMarketFn(mc, data, true);
    }

    function test_RevertWhen_LiquidateBadDebtIsCalledAndReturnedAmountIs0() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        usdo.setMinterStatus(address(this), true);
        usdo.mint(address(userA), 1 ether);

        cluster.updateContract(0, address(userA), true);
        uint256 oracleRate = oracle.rate();
        oracle.set(oracleRate * 100);

        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(
            address(this), address(userA), address(this), IMarketLiquidatorReceiver(address(liquidatorMock)), "", true
        );

        bytes memory badDebtCall = abi.encodeWithSelector(BigBang.execute.selector, modules, calls, true);

        address[] memory mc = new address[](1);
        mc[0] = address(bb);

        bytes[] memory data = new bytes[](1);
        data[0] = badDebtCall;
        // OnCollateralReceiverFailed
        vm.expectRevert();
        penrose.executeMarketFn(mc, data, true);
    }

    function test_WhenLiquidateBadDebtIsCalledAndAllParametersAreValid() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        _setPenroseBigBangDefaults(address(bb));

        _addCollateral(bb);

        _borrow(bb);

        usdo.setMinterStatus(address(this), true);
        usdo.mint(address(userA), 1 ether);

        cluster.updateContract(0, address(userA), true);
        uint256 oracleRate = oracle.rate();
        oracle.set(oracleRate * 100);

        // liquidate with swap collateral
        uint256 liquidateAmount = bb._userBorrowPart(address(this));
        deal(bb._asset(), address(liquidatorMock), liquidateAmount);

        bytes memory liquidateData = abi.encode(liquidateAmount);
        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(
            address(this),
            address(userA),
            address(this),
            IMarketLiquidatorReceiver(address(liquidatorMock)),
            liquidateData,
            true
        );

        bytes memory badDebtCall = abi.encodeWithSelector(BigBang.execute.selector, modules, calls, true);

        address[] memory mc = new address[](1);
        mc[0] = address(bb);

        bytes[] memory data = new bytes[](1);
        data[0] = badDebtCall;
        penrose.executeMarketFn(mc, data, false);

        uint256 borrowPart = bb._userBorrowPart(address(this));
        uint256 collateralShare = bb._userCollateralShare(address(this));
        assertEq(borrowPart, 0);
        assertEq(collateralShare, 0);
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
