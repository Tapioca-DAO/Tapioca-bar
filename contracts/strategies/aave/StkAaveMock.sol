// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../singularity/legacy/mocks/ERC20Mock.sol';

// solhint-disable func-name-mixedcase

contract StkAaveMock is ERC20Mock {
    using BoringERC20 for IERC20;

    ERC20Mock public token;

    uint256 public lastCooldown;

    constructor() ERC20Mock(100_000 * 1e18) {
        token = new ERC20Mock(10_000 * 10**18);
    }

    function REWARD_TOKEN() external view returns (address) {
        return address(token);
    }

    function cooldown() external {
        lastCooldown = block.timestamp;
    }

    function stakerRewardsToClaim(address) public view returns (uint256) {
        if (lastCooldown + 12 days < block.timestamp) return 0;
        return 100 * 1e18;
    }

    function stakersCooldowns(address) external view returns (uint256) {
        return lastCooldown;
    }

    function claimRewards(address to, uint256 amount) external {
        amount = stakerRewardsToClaim(address(0));
        token.freeMint(amount);
        token.transfer(to, amount);
    }
}
