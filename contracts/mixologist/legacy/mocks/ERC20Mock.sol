// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';

contract ERC20Mock is ERC20WithSupply {
    constructor(uint256 _initialAmount) public {
        totalSupply = _initialAmount;
    }

    function freeMint(uint256 _val) public {
        _mint(msg.sender, _val);
    }
}
