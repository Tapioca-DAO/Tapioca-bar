// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {Origins} from "contracts/markets/Origins/Origins.sol";
import {Market} from "contracts/markets/Market.sol";

import {Origins_Unit_Shared} from "../../shared/Origins_Unit_Shared.t.sol";

contract Origins_repay is Origins_Unit_Shared {
    function test_RevertWhen_RepayIsCalledAndContractIsPaused() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        org.updatePause(Market.PauseType.Repay, true);
        assertTrue(org._pauseOptions(Market.PauseType.Repay));

        vm.expectRevert("Market: paused");
        org.repay(100);
    }

    function test_RevertWhen_RepayIsCalledForNoPosition() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        vm.expectRevert(Origins.NothingToRepay.selector);
        org.repay(100);
    }

    function test_WhenRepayIsCalledForSender_origins() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        org.updateAllowedParticipants(address(this), true);
        usdo.setMinterStatus(address(org), true);
        usdo.setBurnerStatus(address(org), true);

        _addCollateral(org);
        org.borrow(5e17);

        _addToYieldBox(address(org), address(usdo), usdoId, 5e17);

        uint256 borrowPartBefore = org._userBorrowPart(address(this));
        org.repay(5e17);
        uint256 borrowPartAfter = org._userBorrowPart(address(this));

        assertGt(borrowPartBefore, borrowPartAfter);
    }

    function _addToYieldBox(address _org, address _asset, uint256 _assetId, uint256 _amount) private {
        deal(_asset, address(this), _amount);

        usdo.approve(address(yieldBox), type(uint256).max);
        usdo.approve(address(pearlmit), type(uint256).max);
        yieldBox.setApprovalForAll(_org, true);
        yieldBox.setApprovalForAll(address(pearlmit), true);
        pearlmit.approve(1155, address(yieldBox), _assetId, _org, type(uint200).max, uint48(block.timestamp));
        yieldBox.depositAsset(_assetId, address(this), address(this), _amount, 0);

        usdo.setMinterStatus(address(this), true);
        usdo.mint(address(this), _amount);
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
