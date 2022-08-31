// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable func-name-mixedcase
// solhint-disable var-name-mixedcase

//TODO: might have to change params after pool is created
interface ICurvePool {
    function coins(uint256 i) external view returns (address);

    function get_dy(
        uint256 i,
        uint256 j,
        uint256 dx
    ) external view returns (uint256);

    function exchange(
        uint256 i,
        uint256 j,
        uint256 dx,
        uint256 min_dy,
        bool use_eth
    ) external payable;
}
