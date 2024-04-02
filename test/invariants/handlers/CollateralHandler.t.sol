// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Contracts
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";
import {BaseStorage} from "../base/BaseStorage.t.sol"; 

// Interfaces
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";

/// @title CollateralHandler
/// @notice Handler test contract for the market collateral modules contracts
contract CollateralHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function addCollateral(uint256 i, uint256 j, bool skim, uint256 amount, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        address to = _getRandomActor(j);

        uint256 collateralBefore = Market(target).userCollateralShare(address(to));

        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, assetIds[address(erc20Mock)], share));

        if (success) {
            (Module[] memory modules, bytes[] memory calls) = marketHelper.addCollateral(address(actor), to, skim, amount, share);

            (success, returnData) = _proxyCall(modules, calls);

            if (success) {
                _after();

                share = _getShares(amount, share);
                _increaseGhostShares(to, share);

                // FUNCTION POSCONDITIONS
                assertLe(
                    Market(target).userCollateralShare(address(to)),
                    collateralBefore + share,
                    LENDING_INVARIANT_A
                );
                assert_GLOBAL_INVARIANT_A(Market.PauseType.AddCollateral);
                //assert_COMMON_INVARIANT_O(share);@audit-issue

                if (targetType == MarketType.BIGBANG) {
                    assert_COMMON_INVARIANT_N();
                }
            }
        }
    }

    function removeCollateral(uint256 i, uint256 j, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        address to = _getRandomActor(j);

        uint256 collateralBefore = Market(target).userCollateralShare(address(actor));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.removeCollateral(address(actor), to, share);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            _decreaseGhostShares(address(actor), share);

            // FUNCTION POSCONDITIONS
            assertEq(
                Market(target).userCollateralShare(address(actor)),
                collateralBefore - share,
                LENDING_INVARIANT_A
            );
            //assert_LENDING_INVARIANT_C(share);@audit-issue

            assert_GLOBAL_INVARIANT_A(Market.PauseType.RemoveCollateral);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      SINGULARITY FUNCTIONS                                //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function addAsset(uint256 j, bool skim, uint256 share) external setup onlyTargetMarket(MarketType.SINGULARITY) {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address to = _getRandomActor(j);

        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, assetIds[address(weth9Mock)], share));

        if (success) {
            (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.addAsset.selector, address(actor), to, skim, share));

            if (success) {
                uint256 fraction = _getAssetFraction(share, false);

                _increaseGhostAsset(to, fraction);

                assert_GLOBAL_INVARIANT_A(Market.PauseType.AddAsset);
            }
        }
    }

    function removeAsset(uint256 j, uint256 fraction) external setup onlyTargetMarket(MarketType.SINGULARITY) {
        bool success;
        bytes memory returnData;

        address to = _getRandomActor(j);

        (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.removeAsset.selector, address(actor), to, fraction));

        if (success) {
            _decreaseGhostAsset(address(actor), fraction);

            assert_GLOBAL_INVARIANT_A(Market.PauseType.RemoveAsset);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                          MARKET FUNCTIONS                                  //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function assert_LENDING_INVARIANT_F(uint256 share) external setup {
        bool success;
        bytes memory returnData;

        bool skim = true;

        Market market = Market(target);

        uint256 collateralBefore = market.userCollateralShare(address(actor));
        uint256 yieldboxShareBefore = yieldbox.balanceOf(address(actor), assetIds[address(erc20Mock)]);
        uint256 yieldboxMarketBalanceBefore = yieldbox.balanceOf(target, assetIds[address(erc20Mock)]);

        _before();

        // ROUNDTRIP PROPERTIES: Transfer collateral to market -> Add collateral -> Remove collateral
        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, assetIds[address(erc20Mock)], share));
        require(success, "Transfer failed");

        (Module[] memory modules, bytes[] memory calls) = marketHelper.addCollateral(address(actor), address(actor), skim, 0, share);
        (success, returnData) = _proxyCallClear(modules, calls);
        require(success, "Add collateral failed");

        (modules, calls) = marketHelper.removeCollateral(address(actor), address(actor), share);
        (success, returnData) = _proxyCallClear(modules, calls);
        require(success, "Remove collateral failed");

        _after();

        // USER ASSERTIONS
        assertEq(collateralBefore, market.userCollateralShare(address(actor)), string.concat(LENDING_INVARIANT_F, " - Collateral share mismatch"));
        assertEq(yieldboxShareBefore, yieldbox.balanceOf(address(actor), assetIds[address(erc20Mock)]), string.concat(LENDING_INVARIANT_F, " - Yieldbox share mismatch"));
        // MARKET ASSERTIONS
        assertEq(marketVars.totalCollateralShareBefore, marketVars.totalCollateralShareAfter, string.concat(LENDING_INVARIANT_F, " - Total collateral share mismatch"));
        assertEq(yieldbox.balanceOf(address(actor), assetIds[address(erc20Mock)]),yieldboxShareBefore, string.concat(LENDING_INVARIANT_F, " - Yieldbox share mismatch"));
        assertEq(yieldbox.balanceOf(target, assetIds[address(erc20Mock)]), yieldboxMarketBalanceBefore, string.concat(LENDING_INVARIANT_F, " - Yieldbox market balance mismatch"));
    }

    function assert_LENDING_INVARIANT_G(uint256 share) external setup onlyTargetMarket(MarketType.SINGULARITY) {
        bool success;
        bytes memory returnData;

        bool skim = true;

        Market market = Market(target);

        uint256 assetBefore = market.balanceOf(address(actor));
        uint256 yieldboxShareBefore = yieldbox.balanceOf(address(actor), assetIds[address(weth9Mock)]);
        uint256 yieldboxMarketBalanceBefore = yieldbox.balanceOf(target, assetIds[address(weth9Mock)]);

        _before();

        // ROUNDTRIP PROPERTIES: Transfer asset to market -> Add asset -> Remove asset
        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, assetIds[address(weth9Mock)], share));
        require(success, "Transfer failed");

        (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.addAsset.selector, address(actor), skim, share));
        require(success, "Add asset failed");
        uint256 fraction = abi.decode(returnData, (uint256));

        (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.removeAsset.selector, address(actor), address(actor), fraction));
        require(success, "Remove asset failed");

        _after();

        // USER ASSERTIONS
        assertEq(assetBefore, market.balanceOf(address(actor)), string.concat(LENDING_INVARIANT_G, " - Asset share mismatch"));
        assertEq(yieldboxShareBefore, yieldbox.balanceOf(address(actor), assetIds[address(weth9Mock)]), string.concat(LENDING_INVARIANT_G, " - Yieldbox share mismatch"));
        // MARKET ASSERTIONS
        assertEq(marketVars.totalSupplyBefore, marketVars.totalSupplyAfter, string.concat(LENDING_INVARIANT_G, " - Total asset share mismatch"));
        assertEq(yieldbox.balanceOf(address(actor), assetIds[address(weth9Mock)]), yieldboxShareBefore, string.concat(LENDING_INVARIANT_G, " - Yieldbox share mismatch"));
        assertEq(yieldbox.balanceOf(target, assetIds[address(weth9Mock)]), yieldboxMarketBalanceBefore, string.concat(LENDING_INVARIANT_G, " - Yieldbox market balance mismatch"));
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
