// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGmxRewardRouterV2 {
    function glpManager() external view returns (address);

    function gmx() external view returns (address);

    function esGmx() external view returns (address);

    function weth() external view returns (address);

    function glpVester() external view returns (address);

    function gmxVester() external view returns (address);

    function feeGlpTracker() external view returns (address);

    function feeGmxTracker() external view returns (address);

    function stakedGlpTracker() external view returns (address);

    function stakedGmxTracker() external view returns (address);

    function mintAndStakeGlp(
        address _token,
        uint256 _amount,
        uint256 _minUsdg,
        uint256 _minGlp
    ) external returns (uint256);

    function mintAndStakeGlpETH(
        uint256 _minUsdg,
        uint256 _minGlp
    ) external payable returns (uint256);

    function handleRewards(
        bool _shouldClaimGmx,
        bool _shouldStakeGmx,
        bool _shouldClaimEsGmx,
        bool _shouldStakeEsGmx,
        bool _shouldStakeMultiplierPoints,
        bool _shouldClaimWeth,
        bool _shouldConvertWethToEth
    ) external;

    function stakeEsGmx(uint256 amount) external;

    function unstakeEsGmx(uint256 amount) external;
}
