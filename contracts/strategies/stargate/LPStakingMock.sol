// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

contract LPStakingMock {
    using BoringERC20 for IERC20;

    IERC20 public lpToken;

    constructor(address _lpToken) {
        lpToken = IERC20(_lpToken);
    }

    function deposit(uint256, uint256 amount) external {
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256, uint256 amount) external {
        lpToken.safeTransfer(msg.sender, amount);
    }
}
