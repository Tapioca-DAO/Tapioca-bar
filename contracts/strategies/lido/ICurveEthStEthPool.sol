// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICurveEthStEthPool {
    // 0	i	int128	1
    // 1	j	int128	0
    // 2	dx	uint256	9999999999999999
    // 3	min_dy	uint256	9888206826924655

    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);

    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);
}
