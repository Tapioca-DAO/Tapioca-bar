// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";

// Interfaces
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title LiquidationHandler
/// @notice Handler test contract for the market liquidation modules contracts
contract LiquidationHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function liquidateBadDebt(uint256 i, address receiver) external setup {//TODO: Implement liquidatorReceiver version of this call
        bool[] memory successArray;
        bytes[] memory returnDataArray;

        // Get one of the three actors randomly
        address user = _getRandomActor(i);

        //address from = _getRandomActor(j);//TODO: Find who should call this function

        // Create the liquidation call data
        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidateBadDebt(user, address(this), receiver, marketLiquidatorReceiver, "", false);

        // Prepare the arrays for the owner call to Penrose
        address[] memory mc = new address[](1); /// @dev target contract
        mc[0] = target;

        bytes[] memory data = new bytes[](1); /// @dev data call to `liquidateBadDebt` neste inside `execute` market function 
        data[0] = abi.encodeWithSelector(IMarket.execute.selector, modules, calls, true);

        _before();

        // Execute the liquidation
        (successArray, returnDataArray) = penrose.executeMarketFn(mc, data, true); //TODO make another case for when this is false

        if (successArray[0]) {
            assert(false);

            _after();
        }
    }

    function liquidate(uint256 i, uint256 maxBorrowPart, uint256 minLiquidationBonus) external setup {
        bool success;
        bytes memory returnData;

        maxBorrowPart = clampGe(maxBorrowPart, 100);

        // Create arrays for the parameters
        address[] memory users = new address[](1);
        uint256[] memory maxBorrowParts = new uint256[](1);
        uint256[] memory minLiquidationBonuses = new uint256[](1);
        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
        bytes[] memory datas = new bytes[](1);

        // Get one of the three actors randomly
        users[0] = _getRandomActor(i);
        maxBorrowParts[0] = maxBorrowPart;
        minLiquidationBonuses[0] = minLiquidationBonus;
        receivers[0] = marketLiquidatorReceiver;
        datas[0] = abi.encode(uint256(maxBorrowPart));

        if (maxBorrowPart > usdo.balanceOf(address(marketLiquidatorReceiver))) {
            (success, returnData) = actor.proxy(address(usdo), abi.encodeWithSelector(IERC20.transfer.selector, address(marketLiquidatorReceiver), (maxBorrowPart - usdo.balanceOf(address(marketLiquidatorReceiver)))));
            require(success, "LiquidationHandler: liquidate - Transfer failed");
        }

        // Select the liquidator as the mesage sender
        actor = liquidator;

        // Create the liquidation call data
        (Module[] memory modules, bytes[] memory calls) = marketHelper.liquidate(users, maxBorrowParts, minLiquidationBonuses, receivers, datas);
        
        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            assert(false);

            _after();

            assert_GLOBAL_INVARIANT_A(Market.PauseType.Liquidation);
        }
    }

    function transferUSDO(uint256 amount) external setup {
        bool success;
        bytes memory returnData;

        (success, returnData) = actor.proxy(address(usdo), abi.encodeWithSelector(IERC20.transfer.selector, address(marketLiquidatorReceiver), amount));

        if (success) {
            assert(true);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
