// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

contract TapiocaOftMock is ERC20WithSupply {
    using BoringERC20 for IERC20;

    string public name = "Fantom";
    string public symbol = "FTM";
    uint8 public decimals;

    bool public isNative;

    IERC20 public erc20;

    uint256 public hostId;

    constructor(uint256 _chainId, address _erc20) {
        hostId = _chainId;
        erc20 = IERC20(_erc20);
    }

    function setHostChain(uint256 _newchain) external {
        hostId = _newchain;
    }

    function wrap(address _toAddress, uint256 _amount) external {
        erc20.safeTransferFrom(msg.sender, _toAddress, _amount);
        _mint(_toAddress, _amount);
    }

    function wrapNative(address _toAddress) external payable {
        _mint(_toAddress, msg.value);
    }

    function hostChainID() external view returns (uint256) {
        return hostId;
    }
}
