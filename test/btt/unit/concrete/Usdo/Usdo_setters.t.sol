// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca 
import {Usdo} from "contracts/usdo/Usdo.sol";

// tests
import {Usdo_Unit_Shared} from "../../shared/Usdo_Unit_Shared.t.sol";

contract Usdo_setters is Usdo_Unit_Shared {
    function test_RevertWhen_SetFlashloanHelperIsCalledFromNon_owner() external resetPrank(userA) {
        address rndAddr = makeAddr("rndAddress");
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        usdo.setFlashloanHelper(rndAddr);
    }

    function test_WhenSetFlashloanHelperIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");
        usdo.setFlashloanHelper(rndAddr);
        assertEq(address(usdo.flashLoanHelper()), rndAddr);
    }

    function test_RevertWhen_ExtractFeesIsCalledFromNon_owner() external resetPrank(userA) {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        usdo.extractFees();
    }

    function test_whenExtractFeesIsCalledFromOwner_GivenFeesAreGreaterThanZero() external {
        // it should transfer the fees to sender
        address rndAddr = makeAddr("rndAddress");
        usdo.setFlashloanHelper(rndAddr);

        // transfer Usdo fees 
        deal(address(usdo), address(usdo), SMALL_AMOUNT);
        uint256 balanceBefore = usdo.balanceOf(address(this));

        // register fees
        _resetPrank(rndAddr);
        usdo.addFlashloanFee(SMALL_AMOUNT);

        _resetPrank(address(this));
        usdo.extractFees();
        
        uint256 balanceAfter = usdo.balanceOf(address(this));
        assertEq(balanceBefore + SMALL_AMOUNT, balanceAfter);
    }

    function test_whenExtractFeesIsCalledFromOwner_GivenFeesAreZero() external {
        uint256 balanceBefore = address(this).balance;
        usdo.extractFees();
        uint256 balanceAfter = address(this).balance;
        // it should not do anything
        assertEq(balanceBefore, balanceAfter);
    }

    function test_RevertWhen_SetMinterStatusIsCalledFromNon_owner() external resetPrank(userA) {
        address rndAddr = makeAddr("rndAddress");
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        usdo.setMinterStatus(rndAddr, true);

        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        usdo.setMinterStatus(rndAddr, false);
    }

    function test_WhenSetMinterStatusIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");
        // it should emit SetMinterStatus
        vm.expectEmit(true, true, true, true);
        emit SetMinterStatus(rndAddr, true);
        // it should not revert
        usdo.setMinterStatus(rndAddr, true);

        // it should update allowedMinter for the current chain
        assertTrue(usdo.allowedMinter(aEid, rndAddr));

        // it should NOT update allowedMinter for other chain
        assertFalse(usdo.allowedMinter(bEid, rndAddr));
    }

    function test_RevertWhen_SetBurnerStatusIsCalledFromNon_owner() external resetPrank(userA) {
        address rndAddr = makeAddr("rndAddress");
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        usdo.setBurnerStatus(rndAddr, true);

        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        usdo.setBurnerStatus(rndAddr, false);
    }

    function test_WhenSetBurnerStatusIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");
        // it should emit SetMinterStatus
        vm.expectEmit(true, true, true, true);
        emit SetBurnerStatus(rndAddr, true);
        // it should not revert
        usdo.setBurnerStatus(rndAddr, true);

        // it should update allowedMinter for the current chain
        assertTrue(usdo.allowedBurner(aEid, rndAddr));

        // it should NOT update allowedMinter for other chain
        assertFalse(usdo.allowedBurner(bEid, rndAddr));
    }

    function test_RevertWhen_SetPauseIsCalledFromNon_ownerAndNon_pauser() external resetPrank(userA) {
        // it should revert
        vm.expectRevert(Usdo.Usdo_NotAuthorized.selector);
        usdo.setPause(true);

        // it should revert
        vm.expectRevert(Usdo.Usdo_NotAuthorized.selector);
        usdo.setPause(false);
    }

    function test_WhenSetPauseIsCalledFromOwner() external {
        usdo.setPause(true);
        assertTrue(usdo.paused());

        usdo.setPause(false);
        assertFalse(usdo.paused());
    }

    function test_WhenSetPauseIsCalledFromPauser() external {
        // it should pause or unpause
        address rndAddr = makeAddr("rndAddress");
        cluster.setRoleForContract(rndAddr, keccak256("PAUSABLE"), true);

        _resetPrank(rndAddr);

        usdo.setPause(true);
        assertTrue(usdo.paused());

        usdo.setPause(false);
        assertFalse(usdo.paused());
    }

    function test_RevertWhen_AddFlashloanFeeIsCalledFromNon_flashLoanHelper() external resetPrank(userA) {
        // it should revert
        vm.expectRevert(Usdo.Usdo_NotAuthorized.selector);
        usdo.addFlashloanFee(SMALL_AMOUNT);
    }
}
