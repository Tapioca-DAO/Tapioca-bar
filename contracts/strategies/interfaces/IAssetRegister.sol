// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../../../yieldbox/contracts/interfaces/IStrategy.sol';
import '../../../yieldbox/contracts/enums/YieldBoxTokenType.sol';

interface IAssetRegister {
    function ids(
        TokenType tokenType,
        address token,
        IStrategy strategy,
        uint256 id
    ) external view returns (uint256);
}
