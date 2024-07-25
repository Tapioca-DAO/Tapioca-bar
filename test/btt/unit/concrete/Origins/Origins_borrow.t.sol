// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {Origins} from "contracts/markets/Origins/Origins.sol";
import {Market} from "contracts/markets/Market.sol";

import {Origins_Unit_Shared} from "../../shared/Origins_Unit_Shared.t.sol";

contract Origins_borrow is Origins_Unit_Shared {
    function test_RevertWhen_BorrowIsCalledAndContractIsPaused() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        org.updatePause(Market.PauseType.Borrow, true);
        assertTrue(org._pauseOptions(Market.PauseType.Borrow));

        vm.expectRevert("Market: paused");
        org.borrow(100);
    }

    function test_WhenBorrowIsCalledForSender() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        org.updateAllowedParticipants(address(this), true);

        uint256 borrowAmount = 9e17;

        usdo.setMinterStatus(address(org), true);

        _addCollateral(org);

        vm.expectRevert(Market.MinBorrowAmountNotMet.selector);
        org.borrow(1);

        org.borrow(borrowAmount);

        uint256 usdoSupply = usdo.totalSupply();
        assertEq(usdoSupply, borrowAmount);

        uint256 borrowPart = org._userBorrowPart(address(this));
        assertEq(borrowPart, borrowAmount);
    }

    function _addCollateral(Origins org) private {
        uint256 amount = 1 ether;
        deal(address(org._collateral()), address(this), amount);
        mainToken.approve(address(yieldBox), type(uint256).max);
        yieldBox.setApprovalForAll(address(org), true);

        uint256 share = yieldBox.toShare(org._collateralId(), amount, false);
        yieldBox.depositAsset(org._collateralId(), address(this), address(this), 0, share);
        org.addCollateral(0, share);
    }
}
