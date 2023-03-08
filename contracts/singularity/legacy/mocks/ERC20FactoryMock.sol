// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import "./ERC20Mock.sol";

contract ERC20FactoryMock {
    ERC20Mock public last;

    function deployToken(
        uint256 _supply,
        uint8 _decimals,
        uint256 _mintLimit
    ) external {
        ERC20Mock tkn = new ERC20Mock(_supply, _decimals, _mintLimit);
        last = tkn;
    }
}
