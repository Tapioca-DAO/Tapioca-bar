// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {Origins} from "contracts/markets/Origins/Origins.sol";
import {Market} from "contracts/markets/Market.sol";

import {Origins_Unit_Shared} from "../../shared/Origins_Unit_Shared.t.sol";

contract Origins_setters is Origins_Unit_Shared {
    function test_RevertWhen_SetMarketConfigIsCalledFromNon_owner() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        address rndAddr = makeAddr("rndAddress");

        vm.startPrank(userA);
        vm.expectRevert();
        org.setMarketConfig(ITapiocaOracle(rndAddr), "0x", 0, 0, 0, 0, 0, 0, 0, 0, 0);
        vm.stopPrank();
    }

    function test_WhenSetMarketConfigIsCalledFromOwner() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        address rndAddr = makeAddr("rndAddress");

        org.setMarketConfig(
            ITapiocaOracle(rndAddr),
            "0x",
            100, //protocol fee
            101, //_liquidationBonusAmount
            102, //_minLiquidatorReward
            103, //_maxLiquidatorReward
            104, //_totalBorrowCap
            105, //_collateralizationRate
            106, //_liquidationCollateralizationRate
            107, //_minBorrowAmount
            108 //_minCollateralAmount
        );

        assertEq(org._protocolFee(), 100);
        assertEq(org._liquidationBonusAmount(), 101);
        assertEq(org._minLiquidatorReward(), 102);
        assertEq(org._maxLiquidatorReward(), 103);
        assertEq(org._totalBorrowCap(), 104);
        assertEq(org._collateralizationRate(), 105);
        assertEq(org._liquidationCollateralizationRate(), 106);
        assertEq(org._minBorrowAmount(), 107);
        assertEq(org._minCollateralAmount(), 108);
    }

    function test_RevertWhen_RescueEthIsCalledFromNon_owner() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        vm.startPrank(userA);
        vm.expectRevert("Ownable: caller is not the owner");
        org.rescueEth(1 ether, address(this));
        vm.stopPrank();
    }

    function test_WhenRescueEthIsCalledFromOwner() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        address rndAddr = makeAddr("rndAddress");
        vm.deal(address(org), 1 ether);
        org.rescueEth(1 ether, rndAddr);
        assertEq(rndAddr.balance, 1 ether);
    }

    function test_RevertWhen_UpdatePauseAllIsCalledFromNon_owner() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        vm.startPrank(userA);
        vm.expectRevert("Market: unauthorized");
        org.updatePauseAll(true);
        vm.stopPrank();
    }

    function test_WhenUpdatePauseAllIsCalledFromPauser() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        assertFalse(org._pauseOptions(Market.PauseType.AddCollateral));
        org.updatePauseAll(true);
        assertTrue(org._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_WhenUpdatePauseAllIsCalledFromOwner() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        assertFalse(org._pauseOptions(Market.PauseType.AddCollateral));
        org.updatePauseAll(true);
        assertTrue(org._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_RevertWhen_UpdatePauseIsCalledFromNon_ownerAndNon_pauser() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        vm.startPrank(userA);
        vm.expectRevert("Market: unauthorized");
        org.updatePause(Market.PauseType.Borrow, true);
        vm.stopPrank();
    }

    function test_WhenUpdatePauseIsCalledFromPauser() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        assertFalse(org._pauseOptions(Market.PauseType.AddCollateral));
        org.updatePause(Market.PauseType.AddCollateral, true);
        assertTrue(org._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_WhenUpdatePauseIsCalledFromOwner() external {
        Origins org = Origins(payable(_registerDefaultOrigins()));
        assertFalse(org._pauseOptions(Market.PauseType.AddCollateral));
        org.updatePause(Market.PauseType.AddCollateral, true);
        assertTrue(org._pauseOptions(Market.PauseType.AddCollateral));
    }
}
