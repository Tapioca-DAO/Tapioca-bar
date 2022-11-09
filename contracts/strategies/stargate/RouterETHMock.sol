// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../mixologist/legacy/mocks/ERC20Mock.sol';

contract RouterETHMock {
    address public stgRouter;
    address public lpToken;

    constructor(address _stgRouter, address _lpToken) {
        stgRouter = _stgRouter;
        lpToken = _lpToken;
    }

    function poolId() external pure returns (uint256) {
        return 1;
    }

    function stargateRouter() external view returns (address) {
        return stgRouter;
    }

    function addLiquidityETH() external payable {
        ERC20Mock(lpToken).freeMint(msg.value);
        ERC20Mock(lpToken).transfer(msg.sender, msg.value - 1);
    }

    receive() external payable {}
}
