// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {Origins} from "contracts/markets/Origins/Origins.sol";
import {Market} from "contracts/markets/Market.sol";

import {Origins_Unit_Shared} from "../../shared/Origins_Unit_Shared.t.sol";

contract Origins_addCollateral is Origins_Unit_Shared {
    function test_RevertWhen_AddCollateralIsCalledAndContractIsPaused() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        org.updatePause(Market.PauseType.AddCollateral, true);
        assertTrue(org._pauseOptions(Market.PauseType.AddCollateral));

        vm.expectRevert("Market: paused");
        org.addCollateral(100, 0);
    }

    function test_WhenOriginsAddCollateralIsCalledForSender() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        uint256 amount = 1 ether;
        deal(address(org._collateral()), address(this), amount);
        mainToken.approve(address(yieldBox), type(uint256).max);
        yieldBox.setApprovalForAll(address(org), true);

        uint256 share = yieldBox.toShare(org._collateralId(), amount, false);
        yieldBox.depositAsset(org._collateralId(), address(this), address(this), 0, share);
        org.addCollateral(0, share);

        uint256 resultedCollateral = org._userCollateralShare(address(this));
        assertEq(resultedCollateral, share);

        uint256 totalCollateralShare = org._totalCollateralShare();
        assertEq(totalCollateralShare, share);

        uint256 bbYieldBoxBalance = yieldBox.balanceOf(address(org), mainTokenId);
        assertEq(bbYieldBoxBalance, share);
    }
}
