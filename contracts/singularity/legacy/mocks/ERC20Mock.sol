// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';

contract ERC20Mock is ERC20WithSupply {
    string public name = 'Test Token';
    string public symbol = 'TT';
    uint8 public decimals;

    constructor(uint256 _initialAmount, uint8 _decimals) {
        totalSupply = _initialAmount;
        decimals = _decimals;
    }

    function freeMint(uint256 _val) public {
        _mint(msg.sender, _val);
    }
}
