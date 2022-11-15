// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../singularity/legacy/mocks/ERC20Mock.sol';

contract CurveMinterMock {
    using BoringERC20 for IERC20;

    ERC20Mock public token;

    constructor(address _token) {
        token = ERC20Mock(_token);
    }

    function mint(address) external {
        token.freeMint(10 * 1e18);
        token.transfer(msg.sender, 10 * 1e18);
    }
}
