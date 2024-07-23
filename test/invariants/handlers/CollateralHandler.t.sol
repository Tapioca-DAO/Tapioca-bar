// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Contracts
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {MarketStateView as Market} from "contracts/markets/MarketStateView.sol";
import {Market as Market_} from "contracts/markets/Market.sol";

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

        uint256 collateralBefore = Market(target)._userCollateralShare(address(to));

        uint256 collateralId = Market(target)._collateralId();

        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, collateralId, share));

        if (success) {
            (Module[] memory modules, bytes[] memory calls) = marketHelper.addCollateral(address(actor), to, skim, amount, share);

            (success, returnData) = _proxyCall(modules, calls);

            if (success) {
                _after();

                share = _getShares(collateralId, amount, share);
                _increaseGhostShares(to, share);

                // FUNCTION POSCONDITIONS
                assertLe(
                    Market(target)._userCollateralShare(address(to)),
                    collateralBefore + share,
                    LENDING_INVARIANT_A
                );
                assert_GLOBAL_INVARIANT_A(Market_.PauseType.AddCollateral);
                assert_COMMON_INVARIANT_O(share);

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

        uint256 collateralBefore = Market(target)._userCollateralShare(address(actor));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.removeCollateral(address(actor), to, share);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            _decreaseGhostShares(address(actor), share);

            // FUNCTION POSCONDITIONS
            assertEq(
                Market(target)._userCollateralShare(address(actor)),
                collateralBefore - share,
                LENDING_INVARIANT_A
            );
            assert_LENDING_INVARIANT_C(share);

            assert_GLOBAL_INVARIANT_A(Market_.PauseType.RemoveCollateral);
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

        uint256 balanceBefore = yieldbox.balanceOf(address(actor), assetIds[address(weth9Mock)]);

        uint256 fractionBalanceBefore = yieldbox.balanceOf(to, assetIds[address(weth9Mock)]);

        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, assetIds[address(weth9Mock)], share));

        if (success) {
            (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.addAsset.selector, address(actor), to, skim, share));

            uint256 balanceDiff = yieldbox.balanceOf(address(actor), assetIds[address(weth9Mock)]) - balanceBefore;

            uint256 fractionBalanceDiff = yieldbox.balanceOf(to, assetIds[address(weth9Mock)]) - fractionBalanceBefore;

            if (success) {
                _after();

                uint256 fraction = _getAssetFraction(share, false);

                _increaseGhostAsset(to, fraction);

                // FUNCTION POSCONDITIONS  
                assert_GLOBAL_INVARIANT_A(Market_.PauseType.AddAsset);

                assertGe(balanceDiff, _getAssets(fractionBalanceDiff, false), SINGULARITY_INVARIANT_I);
            }
        }
    }

    function removeAsset(uint256 j, uint256 fraction) external setup onlyTargetMarket(MarketType.SINGULARITY) {
        bool success;
        bytes memory returnData;

        address to = _getRandomActor(j);

        (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.removeAsset.selector, address(actor), to, fraction));

        if (success) {
            _after();

            _decreaseGhostAsset(address(actor), fraction);

            // FUNCTION POSCONDITIONS  
            assert_GLOBAL_INVARIANT_A(Market_.PauseType.RemoveAsset);
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

        uint256 collateralBefore = market._userCollateralShare(address(actor));
        uint256 yieldboxShareBefore = yieldbox.balanceOf(address(actor), Market(target)._collateralId());
        uint256 yieldboxMarketBalanceBefore = yieldbox.balanceOf(target, Market(target)._collateralId());

        _before();

        // ROUNDTRIP PROPERTIES: Transfer collateral to market -> Add collateral -> Remove collateral
        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, Market(target)._collateralId(), share));
        require(success, "Transfer failed");

        (Module[] memory modules, bytes[] memory calls) = marketHelper.addCollateral(address(actor), address(actor), skim, 0, share);
        (success, returnData) = _proxyCallClear(modules, calls);
        require(success, "Add collateral failed");

        (modules, calls) = marketHelper.removeCollateral(address(actor), address(actor), share);
        (success, returnData) = _proxyCallClear(modules, calls);
        require(success, "Remove collateral failed");

        _after();

        // USER ASSERTIONS
        assertEq(collateralBefore, market._userCollateralShare(address(actor)), string.concat(LENDING_INVARIANT_F, " - Collateral share mismatch"));
        assertEq(yieldboxShareBefore, yieldbox.balanceOf(address(actor), Market(target)._collateralId()), string.concat(LENDING_INVARIANT_F, " - Yieldbox share mismatch"));
        // MARKET ASSERTIONS
        assertEq(marketVars.totalCollateralShareBefore, marketVars.totalCollateralShareAfter, string.concat(LENDING_INVARIANT_F, " - Total collateral share mismatch"));
        assertEq(yieldbox.balanceOf(address(actor), Market(target)._collateralId()),yieldboxShareBefore, string.concat(LENDING_INVARIANT_F, " - Yieldbox share mismatch"));
        assertEq(yieldbox.balanceOf(target, Market(target)._collateralId()), yieldboxMarketBalanceBefore, string.concat(LENDING_INVARIANT_F, " - Yieldbox market balance mismatch"));
    }

    function assert_SINGULARITY_INVARIANT_F(uint256 share) external setup onlyTargetMarket(MarketType.SINGULARITY) {
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

        (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.addAsset.selector, address(actor), address(actor), skim, share));
        require(success, "Add asset failed");
        uint256 fraction = abi.decode(returnData, (uint256));
        require(fraction > 0, "Add asset failed");


        (success, returnData) = actor.proxy(target, abi.encodeWithSelector(Singularity.removeAsset.selector, address(actor), address(actor), fraction));
        require(success, "Remove asset failed");

        _after();

        // USER ASSERTIONS
        assertEq(assetBefore, market.balanceOf(address(actor)), string.concat(SINGULARITY_INVARIANT_F, " - Asset share mismatch"));
        assertEq(yieldboxShareBefore, yieldbox.balanceOf(address(actor), assetIds[address(weth9Mock)]), string.concat(SINGULARITY_INVARIANT_F, " - Yieldbox share mismatch"));
        // MARKET ASSERTIONS
        assertEq(marketVars.totalSupplyBefore, marketVars.totalSupplyAfter, string.concat(SINGULARITY_INVARIANT_F, " - Total asset share mismatch"));
        assertEq(yieldbox.balanceOf(target, assetIds[address(weth9Mock)]), yieldboxMarketBalanceBefore, string.concat(SINGULARITY_INVARIANT_F, " - Yieldbox market balance mismatch"));
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
