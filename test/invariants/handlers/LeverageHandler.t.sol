// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/console.sol";

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Test Contracts
import {BaseHandler, Module} from "../base/BaseHandler.t.sol";

// Interfaces
import {ITarget} from "test/invariants/base/BaseTest.t.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";

/// @title LeverageHandler
/// @notice Handler test contract for the market leverage modules contracts
contract LeverageHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function buyCollateral(uint256 i, uint256 borrowAmount, uint256 supplyAmount) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);

        // Build the swap data
        bytes memory _data = buildSwapData(IERC20(targetContract._asset()), IERC20(targetContract._collateral()), getQuote(borrowAmount, false));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.buyCollateral(from, borrowAmount, supplyAmount, _data);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            assert_GLOBAL_INVARIANT_A(Market.PauseType.LeverageBuy);
        }
    }

    function sellCollateral(uint256 i, uint256 share) external setup {
        bool success;
        bytes memory returnData;

        // Get one of the three actors randomly
        address from = _getRandomActor(i);
        
        address collateral = targetContract._collateral();

        // Calculate the amount of collateral to sell from the shares
        uint256 collateralAmount = yieldbox.toAmount(assetIds[collateral], share, false);

        // Build the swap data
        bytes memory _data = buildSwapData(IERC20(collateral), IERC20(targetContract._asset()), getQuote(collateralAmount, true));

        (Module[] memory modules, bytes[] memory calls) = marketHelper.sellCollateral(from, share, _data);

        (success, returnData) = _proxyCall(modules, calls);

        if (success) {
            _after();

            assert_GLOBAL_INVARIANT_A(Market.PauseType.LeverageBuy);

            assert(false);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////


    function buildSwapData(IERC20 tokenIn, IERC20 tokenOut, uint256 minAmountOut) internal view returns (bytes memory) {
        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData(
            tokenIn,
            tokenOut,
            payable(address(0)),
            ""
        );
        bytes memory swapData = abi.encode(zeroXSwapData);

        SToftInfo memory stInfo = SToftInfo(false, false);

        SLeverageSwapData memory leverageSwapData = SLeverageSwapData(minAmountOut, stInfo, swapData);

        return abi.encode(leverageSwapData);
    }

    /// @dev Gets the exchange rate. I.e how much collateral to buy 1e18 asset.
    function getQuote(uint256 amountIn, bool outIsUSDO) internal view returns (uint256 amountOut) {
        if (outIsUSDO) {
            (, uint256 exchangeRate) = oracle.get("");
            amountOut = amountIn * 1e18 / exchangeRate;
        } else {
            (, uint256 exchangeRate) = oracle.get("");
            console.log("exchangeRate: %s", exchangeRate);
            amountOut = amountIn * exchangeRate / 1e18;
        }
    }
}
