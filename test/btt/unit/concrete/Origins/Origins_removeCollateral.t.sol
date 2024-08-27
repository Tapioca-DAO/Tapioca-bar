// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {Origins} from "contracts/markets/Origins/Origins.sol";
import {Market} from "contracts/markets/Market.sol";

import {Origins_Unit_Shared} from "../../shared/Origins_Unit_Shared.t.sol";

contract Origins_removeCollateral is Origins_Unit_Shared {
    function test_RevertWhen_RemoveCollateralIsCalledAndContractIsPaused() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        org.updatePause(Market.PauseType.RemoveCollateral, true);
        assertTrue(org._pauseOptions(Market.PauseType.RemoveCollateral));

        vm.expectRevert("Market: paused");
        org.removeCollateral(100);
    }

    function test_RevertWhen_RemoveCollateralIsCalledAndUserIsNotSolvent() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        org.updateAllowedParticipants(address(this), true);
        usdo.setMinterStatus(address(org), true);

        uint256 borrowAmount = 9e17;
        _addCollateral(org);
        org.borrow(borrowAmount);

        vm.expectRevert("Market: insolvent");
        org.removeCollateral(0.1 ether);
    }

    function test_WhenRemoveCollateralIsCalledForSender() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        org.updateAllowedParticipants(address(this), true);
        usdo.setMinterStatus(address(org), true);

        _addCollateral(org);
        org.borrow(5e17);

        uint256 collateralShareBefore = org._userCollateralShare(address(this));
        org.removeCollateral(0.1 ether);
        uint256 collateralShareAfter = org._userCollateralShare(address(this));

        assertEq(collateralShareBefore - collateralShareAfter, 0.1 ether);
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
