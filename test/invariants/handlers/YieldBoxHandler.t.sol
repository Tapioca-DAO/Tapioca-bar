// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Interfaces
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";

// Test Contracts
import {BaseHandler} from "../base/BaseHandler.t.sol";

/// @title YieldBoxHandler
/// @notice Handler test contract for the market liquidation modules contracts
contract YieldBoxHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function depositAsset(uint256 i, uint256 j, uint256 amount, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get a random assetId 
        uint256 _assetId = _getRandomYieldBoxAssetId(i);//TODO aprove pearlimit

        // Get one of the three actors randomly
        address to = _getRandomActor(j);

        _before();

        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.depositAsset.selector, _assetId, address(actor), to, amount, share));

        if (success) {
            _after();
        }
    }

    function withdraw(uint256 i, uint256 j, uint256 amount, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get a random assetId 
        uint256 _assetId = _getRandomYieldBoxAssetId(i);

        // Get one of the three actors randomly
        address to = _getRandomActor(j);

        _before();

        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.withdraw.selector, _assetId, address(actor), to, amount, share));

        if (success) {
            _after();
        }
    }

    function transferERC1155(uint256 i, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get a random assetId 
        uint256 _assetId = _getRandomYieldBoxAssetId(i);

        _before();

        (success, returnData) = actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.transfer.selector, address(actor), target, _assetId, share));

        if (success) {
            _after();
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

}
