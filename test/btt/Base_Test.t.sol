// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// contracts
import {IPearlmit, Pearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";

// tests
import {TestHelper} from "../LZSetup/TestHelper.sol";

abstract contract Base_Test is TestHelper {
    uint32 public aEid = 1;
    uint32 publicbEid = 2;

    uint256 public userAPKey = 0x1;
    uint256 public userBPKey = 0x2;
    address public userA = vm.addr(userAPKey);
    address public userB = vm.addr(userBPKey);
    uint256 public initialBalance = 100 ether;

    YieldBox yieldBox;
    Pearlmit pearlmit;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);
        vm.label(userA, "userA");
        vm.label(userB, "userB");

        setUpEndpoints(3, LibraryType.UltraLightNode);

        pearlmit = new Pearlmit("Pearlmit Test", "1", address(this), 0);
        vm.label(address(pearlmit), "Pearlmit Test");

        YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();
        yieldBox = new YieldBox(IWrappedNative(address(0)), uriBuilder, pearlmit, address(this));
    }
}
