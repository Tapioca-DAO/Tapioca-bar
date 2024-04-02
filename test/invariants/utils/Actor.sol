// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interfaces
import {IERC20} from "forge-std/interfaces/IERC20.sol";

// Contracts    
import {YieldBox} from "yieldbox/YieldBox.sol";
import {MarketLiquidationReceiverMock} from "../base/BaseStorage.t.sol";

/// @title Actor
/// @notice Proxy contract for invariant suite actors to avoid Tester calling contracts
/// @dev This expands the flexibility of the invariant suite
contract Actor {
    /// @notice list of tokens to approve
    address[] internal tokens;
    /// @notice list of callers to approve tokens to
    address[] internal callers;

    constructor(address[] memory _tokens, address[] memory _callers, address yieldbox, address target) payable {
        tokens = _tokens;
        callers = _callers;
        for (uint256 i; i < tokens.length; i++) {
            for (uint256 j; j < callers.length; j++) {
                IERC20(tokens[i]).approve(callers[j], type(uint256).max);
            }
        }
        YieldBox(yieldbox).setApprovalForAll(target, true);
    }

    /// @notice Helper function to proxy a call to a target contract, used to avoid Tester calling contracts
    function proxy(
        address _target,
        bytes memory _calldata
    ) public returns (bool success, bytes memory returnData) {
        (success, returnData) = address(_target).call(_calldata);
    }

    /// @notice Helper function to proxy a call and value to a target contract, used to avoid Tester calling contracts
    function proxy(
        address _target,
        bytes memory _calldata,
        uint256 value
    ) public returns (bool success, bytes memory returnData) {
        (success, returnData) = address(_target).call{value: value}(_calldata);
    }

    receive() external payable {}
}


contract LiquidatorActor is Actor {
    address public marketLiquidatorReceiver;
    constructor(address usdo, address token, address swapper, address[] memory _tokens, address[] memory _callers, address yieldbox, address target) Actor(_tokens, _callers, yieldbox, target) {
        MarketLiquidationReceiverMock _marketLiquidatorReceiver = new MarketLiquidationReceiverMock(usdo);
        marketLiquidatorReceiver = address(_marketLiquidatorReceiver);
    }
}