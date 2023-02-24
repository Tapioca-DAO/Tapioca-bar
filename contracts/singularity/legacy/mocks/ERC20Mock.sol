// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';

contract ERC20Mock is ERC20WithSupply {
    string public name = 'Fantom';
    string public symbol = 'FTM';
    uint8 public decimals;

    mapping(address => uint256) public mintedAt;
    uint256 public constant MINT_WINDOW = 24 hours;
    uint256 public mintLimit;

    constructor(
        uint256 _initialAmount,
        uint8 _decimals,
        uint256 _mintLimit
    ) {
        totalSupply = _initialAmount;
        decimals = _decimals;
        mintLimit = _mintLimit;
    }

    function freeMint(uint256 _val) public {
        require(_val <= mintLimit, 'ERC20Mock: amount too big');
        require(
            mintedAt[msg.sender] + MINT_WINDOW <= block.timestamp,
            'ERC20Mock: too early'
        );

        mintedAt[msg.sender] = block.timestamp;

        _mint(msg.sender, _val);
    }
}
