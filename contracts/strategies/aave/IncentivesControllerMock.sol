// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../singularity/legacy/mocks/ERC20Mock.sol';

// solhint-disable func-name-mixedcase

contract IncentivesControllerMock {
    using BoringERC20 for IERC20;

    ERC20Mock public token;

    constructor(address _token) {
        //StkAaveMock
        token = ERC20Mock(_token);
    }

    function REWARD_TOKEN() external view returns (address) {
        return address(token);
    }

    function getUserUnclaimedRewards(address) external pure returns (uint256) {
        return 100 * 10**18;
    }

    function claimRewards(
        address[] calldata,
        uint256,
        address to
    ) external returns (uint256) {
        token.freeMint(100 * 10**18);
        token.transfer(to, 100 * 10**18);
        return 100 * 10**18;
    }

    function getRewardsBalance(address[] calldata, address)
        external
        pure
        returns (uint256)
    {
        return 100 * 10**18;
    }
}
