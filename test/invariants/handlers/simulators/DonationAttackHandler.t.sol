// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {BaseHandler} from "../../base/BaseHandler.t.sol";

// Mocks
import {ERC20Mock} from "test/mocks/ERC20Mock.sol";

// Interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DonationAttackHandler
/// @notice Handler test contract for the  DonationAttack actions
contract DonationAttackHandler is BaseHandler {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      STATE VARIABLES                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       GHOST VARAIBLES                                     //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           ACTIONS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice This function transfers any amount of assets to the target contract in the system
    /// @dev Flashloan simulator
    function donateERC20(uint256 amount, uint8 i) external {
        ERC20Mock _token = ERC20Mock(_getRandomBaseAsset(i));

        _token.mint(address(this), amount);

        _token.transfer(target, amount);
    }

    /// @notice This function transfers any amount of yieldbox assets to a the target contract in the system
    /// @dev Flashloan simulator
    function donateYieldbox(uint256 amount, uint256 share, uint8 i) external {
        ERC20Mock _token = ERC20Mock(_getRandomBaseAsset(i));

        _token.mint(address(this), amount);

        yieldbox.depositAsset(assetIds[address(_token)], address(this), target, amount, share);
    }

    function transferToSwapper(uint256 amount, uint8 i) external setup {
        if (i % 2 == 0) {
            actor.proxy(address(usdo), abi.encodeWithSelector(IERC20.transfer.selector, address(swapperMock), amount));
        } else {
            actor.proxy(address(usdo), abi.encodeWithSelector(IERC20.transfer.selector, address(marketLiquidatorReceiver), amount));
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////
}
