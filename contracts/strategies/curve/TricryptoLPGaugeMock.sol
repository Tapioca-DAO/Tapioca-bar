// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../singularity/legacy/mocks/ERC20Mock.sol';

// solhint-disable var-name-mixedcase
// solhint-disable func-name-mixedcase

contract TricryptoLPGaugeMock {
    using BoringERC20 for IERC20;

    address public lpToken;
    address public rewardToken;

    constructor(address _lpToken, address _rewardToken) {
        lpToken = _lpToken;
        rewardToken = _rewardToken;
    }

    function crv_token() external view returns (address) {
        return rewardToken;
    }

    function deposit(
        uint256 _value,
        address,
        bool
    ) external {
        IERC20(lpToken).safeTransferFrom(msg.sender, address(this), _value);
    }

    function withdraw(uint256 value, bool) external {
        // ERC20Mock(lpToken).freeMint(value);
        IERC20(lpToken).safeTransfer(msg.sender, value);
    }

    function balanceOf(address) external view returns (uint256) {
        return IERC20(lpToken).balanceOf(address(this));
    }

    function claimable_tokens(address) external pure returns (uint256) {
        return 10 * 1e18;
    }
    //     function crv_token() external view returns (address);

    // function deposit(
    //     uint256 _value,
    //     address _addr,
    //     bool _claim_rewards
    // ) external;

    // function withdraw(uint256 value, bool _claim_rewards) external;

    // function claim_rewards(address _addr, address _receiver) external;

    // function claimable_tokens(address _addr) external returns (uint256);

    // function balanceOf(address _addr) external view returns (uint256);
}
