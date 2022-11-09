// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

// solhint-disable var-name-mixedcase
// solhint-disable func-name-mixedcase

contract TricryptoLPGaugeMock {
    using BoringERC20 for IERC20;

    address public lpToken;

    constructor(address _lpToken) {
        lpToken = _lpToken;
    }

    function deposit(
        uint256 _value,
        address,
        bool
    ) external {
        IERC20(lpToken).safeTransferFrom(msg.sender, address(this), _value);
    }

    function withdraw(uint256 value, bool) external {
        IERC20(lpToken).safeTransfer(msg.sender, value);
    }

    function balanceOf(address) external view returns (uint256) {
        return IERC20(lpToken).balanceOf(address(this));
    }
}
