// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// tests
import {Usdo_Unit_Shared} from "../../shared/Usdo_Unit_Shared.t.sol";

contract Usdo_constructor is Usdo_Unit_Shared {
    function test_WhenUsdoIsCreatedWithTheRightParameters() external {
        // it should set the delegate parameter as the owner
        assertEq(usdo.owner(), address(this));

        // it should set UsdoSender module
        assertFalse(address(usdoSender) == address(0));

        // it should set UsdoReceiver module
        assertFalse(address(usdoReceiver) == address(0));

        // it should set UsdoMarketReceiver module
        assertFalse(address(usdoMarketReceiverModule) == address(0));

        // it should set UsdoOptionReceiver module
        assertFalse(address(usdoOptionsReceiverModule) == address(0));

        // it should set Pearlmit
        assertEq(address(usdo.pearlmit()), address(pearlmit));

        // it should set YieldBox
        assertEq(address(usdo.yieldBox()), address(yieldBox));

        // it should set the name to 'USDO Stablecoin'
        assertEq(usdo.name(), "USDO Stablecoin");

        // it should set the symbol to 'USDO' 
        assertEq(usdo.symbol(), "USDO");

        // it should be able to receive native gas
        payable(address(usdo)).transfer(SMALL_AMOUNT);
        assertEq(address(usdo).balance, SMALL_AMOUNT);   
    }

    function test_whenUsdoIsCreatedWithTheWrongParameters_WhenEmptyAddressIsUsed() external {
        // it should revert for UsdoSender module
        _tryCreateUsdo(true, address(0), address(usdoReceiver), address(usdoMarketReceiverModule), address(usdoOptionsReceiverModule));
        // it should revert for UsdoReceiver module
        _tryCreateUsdo(true, address(usdoSender), address(0), address(usdoMarketReceiverModule), address(usdoOptionsReceiverModule));
        // it should revert for UsdoMarketReceiver module
        _tryCreateUsdo(true, address(usdoSender), address(usdoReceiver), address(0), address(usdoOptionsReceiverModule));
        // it should revert for UsdoOptionReceiver module
        _tryCreateUsdo(true, address(usdoSender), address(usdoReceiver), address(usdoMarketReceiverModule), address(0));
    }
}
