// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../../singularity/legacy/mocks/ERC20Mock.sol';

import './IConvexZap.sol';

contract ConvexZapMock is IConvexZap {
    using BoringERC20 for IERC20;

    address public reward1;
    address public reward2;

    constructor(address _reward1, address _reward2) {
        reward1 = _reward1;
        reward2 = _reward2;
    }

    function claimRewards(
        address[] memory,
        address[] memory,
        address[] memory,
        address[] memory,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) public override {
        ERC20Mock(reward1).freeMint(10**19);
        ERC20Mock(reward2).freeMint(10**19);

        IERC20(reward1).safeTransfer(msg.sender, 10**19);
        IERC20(reward2).safeTransfer(msg.sender, 10**19);
    }
}
