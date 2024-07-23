// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {Singularity, Module} from "contracts/markets/singularity/Singularity.sol";

contract SingularityExtended is Singularity {
    function executeExtended(Module[] calldata modules, bytes[] calldata calls, bool revertOnFail)
        external
        nonReentrant
        returns (bool[] memory successes, bytes[] memory results)
    {
        successes = new bool[](calls.length);
        results = new bytes[](calls.length);
        if (modules.length != calls.length) revert NotValid();
        unchecked {
            for (uint256 i; i < calls.length; i++) {
                (bool success, bytes memory result) = _extractModuleExtended(modules[i]).delegatecall(calls[i]);

                if (!success && revertOnFail) {
                    assembly {
                        revert(add(result, 0x20), mload(result))
                    }
                }

                successes[i] = success;
                results[i] = !success ? _getRevertMsgExtended(result) : result;
            }
        }
    }

    function _extractModuleExtended(Module _module) private view returns (address) {
        address module;
        if (_module == Module.Base) {
            return address(this);
        } else if (_module == Module.Borrow) {
            module = address(borrowModule);
        } else if (_module == Module.Collateral) {
            module = address(collateralModule);
        } else if (_module == Module.Liquidation) {
            module = address(liquidationModule);
        } else if (_module == Module.Leverage) {
            module = address(leverageModule);
        }
        if (module == address(0)) revert ModuleNotSet();

        return module;
    }

    function _getRevertMsgExtended(bytes memory _returnData) internal pure returns (bytes memory) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return _returnData; // All that remains is the revert string
    }
}