// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {Markets_Unit_Shared} from "../../shared/Markets_Unit_Shared.t.sol";

import {Penrose} from "contracts/Penrose.sol";

contract Penrose_setters is Markets_Unit_Shared {
    function test_RevertWhen_SetMainTokensIsCalledFromNon_owner() external {
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.setMainTokens(address(0), 0, address(0), 0);
        vm.stopPrank();
    }

    function test_WhenSetMainTokensIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.expectEmit();
        emit Penrose.MainTokensUpdated();
        penrose.setMainTokens(rndAddr, 1, rndAddr, 1);

        address assignedMainToken = address(penrose.mainToken());
        assertEq(assignedMainToken, rndAddr);

        address assignedTapToken = address(penrose.tapToken());
        assertEq(assignedTapToken, rndAddr);

        uint256 assignedMainAssetId = penrose.mainAssetId();
        assertEq(assignedMainAssetId, 1);

        uint256 assignedTapAssetId = penrose.tapAssetId();
        assertEq(assignedTapAssetId, 1);
    }

    function test_RevertWhen_SetClusterIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.setCluster(rndAddr);
        vm.stopPrank();
    }

    function test_RevertWhen_SetClusterIsCalledFromOwnerWithAddress0() external {
        vm.expectRevert();
        penrose.setCluster(address(0));
    }

    function test_WhenSetClusterIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");

        vm.expectEmit();
        emit Penrose.ClusterSet(address(penrose.cluster()), rndAddr);
        penrose.setCluster(rndAddr);
        assertEq(address(penrose.cluster()), rndAddr);
    }

    function test_RevertWhen_SetBigBangEthMarketDebtRateIsCalledFromNon_owner() external {
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.setBigBangEthMarketDebtRate(1);
        vm.stopPrank();
    }

    function test_WhenSetBigBangEthMarketDebtRateIsCalledFromOwner() external {
        penrose.setBigBangEthMarketDebtRate(10);
        assertEq(penrose.bigBangEthDebtRate(), 10);
    }

    function test_RevertWhen_SetBigBangEthMarketIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.setBigBangEthMarket(rndAddr);
        vm.stopPrank();
    }

    function test_RevertWhen_SetBigBangEthMarketIsCalledFromOwnerWithAddress0() external {
        vm.expectRevert();
        penrose.setBigBangEthMarket(address(0));
    }

    function test_WhenSetBigBangEthMarketIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectEmit();
        emit Penrose.BigBangEthMarketUpdated(address(penrose.bigBangEthMarket()), rndAddr);
        penrose.setBigBangEthMarket(rndAddr);
        assertEq(address(penrose.bigBangEthMarket()), rndAddr);
    }

    function test_RevertWhen_SetUsdoTokenIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.setUsdoToken(rndAddr, 1);
        vm.stopPrank();
    }

    function test_RevertWhen_SetUsdoTokenIsCalledFromOwnerWithAddress0() external {
        vm.expectRevert();
        penrose.setUsdoToken(address(0), 1);
    }

    function test_RevertWhen_SetUsdoTokenIsCalledFromOwnerWithAsset0() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectRevert();
        penrose.setUsdoToken(rndAddr, 0);
    }

    function test_WhenSetUsdoTokenIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectEmit();
        emit Penrose.UsdoTokenUpdated(rndAddr, 10);
        penrose.setUsdoToken(rndAddr, 10);
        assertEq(address(penrose.usdoToken()), rndAddr);
        assertEq(penrose.usdoAssetId(), 10);
    }

    function test_RevertWhen_SetPauseIsCalledFromNon_ownerAndNon_pauser() external {
        vm.startPrank(userA);
        vm.expectRevert();
        penrose.setPause(false);
        vm.stopPrank();
    }

    function test_WhenSetPauseIsCalledFromPauser() external {
        cluster.setRoleForContract(address(userA), keccak256("PAUSABLE"), true);
        vm.startPrank(userA);
        penrose.setPause(true);
        vm.stopPrank();
        assertEq(penrose.paused(), true);
    }

    function test_WhenSetPauseIsCalledFromOwner() external {
        penrose.setPause(true);
        assertEq(penrose.paused(), true);
    }
}
