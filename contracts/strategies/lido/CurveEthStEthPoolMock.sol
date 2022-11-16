// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

contract CurveEthStEthPoolMock {
    using BoringERC20 for IERC20;

    address public steth;

    constructor(address _steth) {
        steth = _steth;
    }

    function exchange(
        int128,
        int128,
        uint256 dx,
        uint256
    ) external returns (uint256) {
        IERC20(steth).safeTransferFrom(msg.sender, address(this), dx);
        safeTransferETH(msg.sender, dx); //we assume contract has eth
        return dx;
    }

    function get_dy(
        int128,
        int128,
        uint256 dx
    ) external pure returns (uint256) {
        return dx;
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'StargateStrategy: ETH transfer failed');
    }

    receive() external payable {}
}
