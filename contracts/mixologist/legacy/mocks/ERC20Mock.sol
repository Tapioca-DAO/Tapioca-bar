// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';

contract ERC20Mock is ERC20WithSupply {
    string public name = 'Test Token';
    string public symbol = 'TT';
    uint8 public decimals = 18;

    constructor(uint256 _initialAmount) {
        totalSupply = _initialAmount;
    }

    function freeMint(uint256 _val) public {
        _mint(msg.sender, _val);
    }
}
