// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca 
import {Usdo} from "contracts/usdo/Usdo.sol";

// tests
import {Usdo_Unit_Shared} from "../../shared/Usdo_Unit_Shared.t.sol";

contract Usdo_minters_buners is Usdo_Unit_Shared {
    modifier whenPaused() {
        if (!usdo.paused()) {
            usdo.setPause(true);
        }
        _;
    }

    function test_RevertWhen_MintIsCalledAndPaused(uint256 amount) external whenPaused {
        vm.assume(amount > 0 && amount < LARGE_AMOUNT);
        // it should revert
        vm.expectRevert("Pausable: paused");
        usdo.mint(address(this), amount);
    }

    function test_RevertWhen_BurnIsCalledAndPaused(uint256 amount) external whenPaused {
        vm.assume(amount > 0 && amount < LARGE_AMOUNT);
        // it should revert
        vm.expectRevert("Pausable: paused");
        usdo.burn(address(this), amount);
    }

    modifier whenNotPaused() {
        if (usdo.paused()) {
            usdo.setPause(false);
        }
        _;
    }

    modifier givenSenderIsNotAllowed() {
        usdo.setMinterStatus(address(this), false);
        usdo.setBurnerStatus(address(this), false);
        _;
    }

    function test_RevertWhen_MintIsCalledAndSenderNotAllowed(uint256 amount) external whenNotPaused givenSenderIsNotAllowed {
        vm.assume(amount > 0 && amount < LARGE_AMOUNT);
        // it should revert
        vm.expectRevert(Usdo.Usdo_NotAuthorized.selector);
        usdo.mint(address(this), amount);
    }

    function test_RevertWhen_BurnIsCalledAndSenderNotAllowed(uint256 amount) external whenNotPaused givenSenderIsNotAllowed {
        vm.assume(amount > 0 && amount < LARGE_AMOUNT);
        // it should revert
        vm.expectRevert(Usdo.Usdo_NotAuthorized.selector);
        usdo.burn(address(this), amount);
    }

    modifier givenSenderIsAllowed() {
        usdo.setMinterStatus(address(this), true);
        usdo.setBurnerStatus(address(this), true);
        _;
    }

    function test_WhenMintIsCalled(uint256 amount) external whenNotPaused givenSenderIsAllowed {
        address rndAddr = makeAddr("rndAddress");
        vm.assume(amount > 0 && amount < LARGE_AMOUNT);

        uint256 supplyBefore = usdo.totalSupply();
        uint256 supplyRndBefore = usdo.balanceOf(rndAddr);
        usdo.mint(rndAddr, amount);
        uint256 supplyAfter = usdo.totalSupply();
        uint256 supplyRndAfter = usdo.balanceOf(rndAddr);

        // it should increase total supply
        assertEq(supplyBefore + amount, supplyAfter);
        // it should increase balance for to
        assertEq(supplyRndBefore + amount, supplyRndAfter);
    }

    function test_WhenBurnIsCalled(uint256 amount, uint256 burnAmount) external whenNotPaused givenSenderIsAllowed {
        address rndAddr = makeAddr("rndAddress");
        vm.assume(amount > 0 && amount < LARGE_AMOUNT);
        vm.assume(burnAmount > 0 && burnAmount < amount);

        // mint
        usdo.mint(rndAddr, amount);

        uint256 supplyBefore = usdo.totalSupply();
        uint256 supplyRndBefore = usdo.balanceOf(rndAddr);
        usdo.burn(rndAddr, burnAmount);
        uint256 supplyAfter = usdo.totalSupply();
        uint256 supplyRndAfter = usdo.balanceOf(rndAddr);

        // it should decrease total supply
        assertEq(supplyBefore - burnAmount, supplyAfter);
        // it should decrease balance for to
        assertEq(supplyRndBefore - burnAmount, supplyRndAfter);
    }

    function test_RevertWhen_BurnIsCalledFromAnAmountTooBig(uint256 amount, uint256 burnAmount) external whenNotPaused givenSenderIsAllowed {
        address rndAddr = makeAddr("rndAddress");
        vm.assume(amount > 0 && amount < LARGE_AMOUNT);
        vm.assume(burnAmount > amount);

        // mint
        usdo.mint(rndAddr, amount);

        vm.expectRevert("ERC20: burn amount exceeds balance");
        usdo.burn(rndAddr, burnAmount);
    }
}
