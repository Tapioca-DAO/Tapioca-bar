// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './ITricryptoLiquidityPool.sol';

interface ITricryptoLPGetter {
    /// @notice returns curve's liquidity pool
    function liquidityPool() external returns (ITricryptoLiquidityPool);

    /// @notice returns lp token address
    function lpToken() external view returns (address);

    /// @notice returns usdt address
    // solhint-disable-next-line func-name-mixedcase
    function USDT() external view returns (address);

    /// @notice returns usdc address
    // solhint-disable-next-line func-name-mixedcase
    function WBTC() external view returns (address);

    /// @notice returns dai address
    // solhint-disable-next-line func-name-mixedcase
    function WETH() external view returns (address);

    /// @notice returns WETH amount for LP tokens
    /// @param _lpAmount LP token amount
    function calcLpToWeth(uint256 _lpAmount) external view returns (uint256);

    /// @notice returns LP amount for WETH
    /// @param _amount token amount
    function calcWethToLp(uint256 _amount) external view returns (uint256);

    /// @notice returns WBTC amount for LP tokens
    /// @param _lpAmount LP token amount
    function calcLpToWbtc(uint256 _lpAmount) external view returns (uint256);

    /// @notice returns LP amount for WBTC
    /// @param _amount token amount
    function calcWbtcToLp(uint256 _amount) external view returns (uint256);

    /// @notice returns USDT amount for LP tokens
    /// @param _lpAmount LP token amount
    function calcLpToUsdt(uint256 _lpAmount) external view returns (uint256);

    /// @notice returns LP amount for USDT
    /// @param _amount token amount
    function calcUsdtToLp(uint256 _amount) external view returns (uint256);

    /// @notice used to add USDT liquidity
    /// @param _amount the amount of token to be used in the add liquidity operation
    /// @param _minAmount the min amount of LP token to be received
    function addLiquidityUsdt(uint256 _amount, uint256 _minAmount)
        external
        returns (uint256);

    /// @notice used to add WBTC liquidity
    /// @param _amount the amount of token to be used in the add liquidity operation
    /// @param _minAmount the min amount of LP token to be received
    function addLiquidityWbtc(uint256 _amount, uint256 _minAmount)
        external
        returns (uint256);

    /// @notice used to add WETH liquidity
    /// @param _amount the amount of token to be used in the add liquidity operation
    /// @param _minAmount the min amount of LP token to be received
    function addLiquidityWeth(uint256 _amount, uint256 _minAmount)
        external
        returns (uint256);

    /// @notice used to remove liquidity and get USDT
    /// @param _amount the amount of LP token to be used in the remove liquidity operation
    /// @param _minAmount the min amount of token to be received
    function removeLiquidityUsdt(uint256 _amount, uint256 _minAmount)
        external
        returns (uint256);

    /// @notice used to remove liquidity and get WBTC
    /// @param _amount the amount of LP token to be used in the remove liquidity operation
    /// @param _minAmount the min amount of token to be received
    function removeLiquidityWbtc(uint256 _amount, uint256 _minAmount)
        external
        returns (uint256);

    /// @notice used to remove liquidity and get WETH
    /// @param _amount the amount of LP token to be used in the remove liquidity operation
    /// @param _minAmount the min amount of token to be received
    function removeLiquidityWeth(uint256 _amount, uint256 _minAmount)
        external
        returns (uint256);
}
