// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRouterETH {
    function addLiquidityETH() external payable;

    function stargateEthVault() external view returns (address); //STGETH

    function poolId() external view returns (uint16);

    function stargateRouter() external view returns (address);

}
