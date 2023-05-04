// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./BaseOFT.sol";

//TODO: to be removed after beta phase
abstract contract USDOMocks is BaseOFT {
    mapping(address => uint256) public mintedAt;
    uint256 public constant MINT_WINDOW = 24 hours;
    uint256 public mintLimit;
    address public _owner;

    constructor(IYieldBoxBase _yieldBox) BaseOFT(_yieldBox) {}

    function setMintLimit(uint256 _val) external onlyOwner {
        mintLimit = _val;
    }

    function freeMint(uint256 _val) external {
        require(_val <= mintLimit, "USDO: amount too big");
        require(
            mintedAt[msg.sender] + MINT_WINDOW <= block.timestamp,
            "USDO: too early"
        );

        mintedAt[msg.sender] = block.timestamp;

        _mint(msg.sender, _val);
    }
}
