// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IComposableStablePool.sol';
import './IBalancerVault.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../../singularity/legacy/mocks/ERC20Mock.sol';

contract BalancerVaultMock {
    using BoringERC20 for IERC20;

    address public stablePool; //lp token

    constructor(address _stablePool) {
        stablePool = _stablePool;
    }

    function joinPool(
        bytes32,
        address sender,
        address recipient,
        IBalancerVault.JoinPoolRequest memory request
    ) external payable {
        IERC20(address(request.assets[0])).safeTransferFrom(
            sender,
            address(this),
            request.maxAmountsIn[0]
        );

        ERC20Mock(stablePool).freeMint(request.maxAmountsIn[0] - 100);
        IERC20(stablePool).safeTransfer(
            recipient,
            request.maxAmountsIn[0] - 100
        );
    }

    function exitPool(
        bytes32,
        address sender,
        address payable recipient,
        IBalancerVault.ExitPoolRequest memory request
    ) external {
        IERC20(stablePool).safeTransferFrom(
            sender,
            address(this),
            request.minAmountsOut[0]
        );
        IERC20(address(request.assets[0])).safeTransfer(
            recipient,
            request.minAmountsOut[0] + 100
        );
    }

    function getPool(bytes32)
        external
        view
        returns (address, IBalancerVault.PoolSpecialization)
    {
        return (stablePool, IBalancerVault.PoolSpecialization.GENERAL);
    }

    receive() external payable {}
}
