// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';

interface IGmxRewardDistributor is IERC20 {
    function admin() external view returns (address);

    function tokensPerInterval() external view returns (uint256);

    function setTokensPerInterval(uint256) external;

    function pendingRewards() external view returns (uint256);
}
