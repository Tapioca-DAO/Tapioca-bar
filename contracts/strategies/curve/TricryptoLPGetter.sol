// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import './ITricryptoLiquidityPool.sol';
import './ITricryptoLPGetter.sol';

/*

__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__
*/

contract TricryptoLPGetter is BoringOwnable, ReentrancyGuard {
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    ITricryptoLiquidityPool public liquidityPool; //0xD51a44d3FaE010294C616388b506AcdA1bfAAE46

    address public immutable USDT;
    address public immutable WBTC;
    address public immutable WETH;

    IERC20 public immutable lpToken;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when liquidity was added
    event AddedLiquidity(
        address indexed token,
        uint256 amount,
        uint256 obtainedLP
    );
    /// @notice event emitted when liquidity was added
    event RemovedLiquidity(
        address indexed token,
        uint256 amountLP,
        uint256 obtainedAssets
    );

    constructor(
        address _liquidityPool,
        address _usdt,
        address _wbtc,
        address _weth
    ) {
        USDT = _usdt;
        WBTC = _wbtc;
        WETH = _weth;

        liquidityPool = ITricryptoLiquidityPool(_liquidityPool);
        lpToken = IERC20(liquidityPool.token());
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns WETH amount for LP tokens
    /// @param _lpAmount LP token amount
    function calcLpToWeth(uint256 _lpAmount) external view returns (uint256) {
        return _calcWithdrawInOneCoin(_lpAmount, 2);
    }

    /// @notice returns LP amount for WETH
    /// @param _amount token amount
    function calcWethToLp(uint256 _amount) external view returns (uint256) {
        uint256[3] memory liquidityArr;
        liquidityArr[0] = 0;
        liquidityArr[1] = 0;
        liquidityArr[2] = _amount;
        return _calcDepositInOneCoin(liquidityArr);
    }

    /// @notice returns WBTC amount for LP tokens
    /// @param _lpAmount LP token amount
    function calcLpToWbtc(uint256 _lpAmount) external view returns (uint256) {
        return _calcWithdrawInOneCoin(_lpAmount, 1);
    }

    /// @notice returns LP amount for WBTC
    /// @param _amount token amount
    function calcWbtcToLp(uint256 _amount) external view returns (uint256) {
        uint256[3] memory liquidityArr;
        liquidityArr[0] = 0;
        liquidityArr[1] = _amount;
        liquidityArr[2] = 0;
        return _calcDepositInOneCoin(liquidityArr);
    }

    /// @notice returns USDT amount for LP tokens
    /// @param _lpAmount LP token amount
    function calcLpToUsdt(uint256 _lpAmount) external view returns (uint256) {
        return _calcWithdrawInOneCoin(_lpAmount, 0);
    }

    /// @notice returns LP amount for USDT
    /// @param _amount token amount
    function calcUsdtToLp(uint256 _amount) external view returns (uint256) {
        uint256[3] memory liquidityArr;
        liquidityArr[0] = _amount;
        liquidityArr[1] = 0;
        liquidityArr[2] = 0;
        return _calcDepositInOneCoin(liquidityArr);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice used to add WETH liquidity
    /// @param _amount the amount of token to be used in the add liquidity operation
    /// @param _minAmount the min amount of LP token to be received
    function addLiquidityWeth(uint256 _amount, uint256 _minAmount)
        external
        nonReentrant
        returns (uint256)
    {
        uint256[3] memory liquidityArr;
        liquidityArr[0] = 0;
        liquidityArr[1] = 0;
        liquidityArr[2] = _amount;
        return _addLiquidity(WETH, _amount, liquidityArr, _minAmount);
    }

    /// @notice used to remove liquidity and get WETH
    /// @param _amount the amount of LP token to be used in the remove liquidity operation
    /// @param _minAmount the min amount of token to be received
    function removeLiquidityWeth(uint256 _amount, uint256 _minAmount)
        external
        nonReentrant
        returns (uint256)
    {
        return _removeLiquidity(WETH, _amount, 2, _minAmount);
    }

    /// @notice used to add WBTC liquidity
    /// @param _amount the amount of token to be used in the add liquidity operation
    /// @param _minAmount the min amount of LP token to be received
    function addLiquidityWbtc(uint256 _amount, uint256 _minAmount)
        external
        nonReentrant
        returns (uint256)
    {
        uint256[3] memory liquidityArr;
        liquidityArr[0] = 0;
        liquidityArr[1] = _amount;
        liquidityArr[2] = 0;
        return _addLiquidity(WBTC, _amount, liquidityArr, _minAmount);
    }

    /// @notice used to remove liquidity and get WBTC
    /// @param _amount the amount of LP token to be used in the remove liquidity operation
    /// @param _minAmount the min amount of token to be received
    function removeLiquidityWbtc(uint256 _amount, uint256 _minAmount)
        external
        nonReentrant
        returns (uint256)
    {
        return _removeLiquidity(WBTC, _amount, 1, _minAmount);
    }

    /// @notice used to add USDT liquidity
    /// @param _amount the amount of token to be used in the add liquidity operation
    /// @param _minAmount the min amount of LP token to be received
    function addLiquidityUsdt(uint256 _amount, uint256 _minAmount)
        external
        nonReentrant
        returns (uint256)
    {
        uint256[3] memory liquidityArr;
        liquidityArr[0] = _amount;
        liquidityArr[1] = 0;
        liquidityArr[2] = 0;
        return _addLiquidity(USDT, _amount, liquidityArr, _minAmount);
    }

    /// @notice used to remove liquidity and get USDT
    /// @param _amount the amount of LP token to be used in the remove liquidity operation
    /// @param _minAmount the min amount of token to be received
    function removeLiquidityUsdt(uint256 _amount, uint256 _minAmount)
        external
        nonReentrant
        returns (uint256)
    {
        return _removeLiquidity(USDT, _amount, 0, _minAmount);
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _calcDepositInOneCoin(uint256[3] memory arr)
        private
        view
        returns (uint256)
    {
        return liquidityPool.calc_token_amount(arr, true);
    }

    function _calcWithdrawInOneCoin(uint256 _lpAmount, uint256 _index)
        private
        view
        returns (uint256)
    {
        return liquidityPool.calc_withdraw_one_coin(_lpAmount, _index);
    }

    function _addLiquidity(
        address _token,
        uint256 _amount,
        uint256[3] memory arr,
        uint256 _min
    ) private returns (uint256 result) {
        require(_amount > 0, 'Amount not valid');
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(_token).approve(address(liquidityPool), _amount);

        uint256 lpBalanceBefore = lpToken.balanceOf(address(this));
        liquidityPool.add_liquidity(arr, _min);
        uint256 lpBalanceAfter = lpToken.balanceOf(address(this));
        require(lpBalanceAfter > lpBalanceBefore, 'Add liquidity failed');

        result = lpBalanceAfter - lpBalanceBefore;
        lpToken.safeTransfer(msg.sender, result);
        emit AddedLiquidity(_token, _amount, result);
    }

    function _removeLiquidity(
        address _token,
        uint256 _amount,
        uint256 _index,
        uint256 _min
    ) private returns (uint256 result) {
        require(_amount > 0, 'Amount not valid');

        lpToken.safeTransferFrom(msg.sender, address(this), _amount);
        lpToken.approve(address(liquidityPool), _amount);

        uint256 assetBalanceBefore = IERC20(_token).balanceOf(address(this));
        liquidityPool.remove_liquidity_one_coin(_amount, _index, _min);
        uint256 assetBalanceAfter = IERC20(_token).balanceOf(address(this));
        require(
            assetBalanceAfter > assetBalanceBefore,
            'Remove liquidity failed'
        );

        result = assetBalanceAfter - assetBalanceBefore;
        IERC20(_token).safeTransfer(msg.sender, result);
        emit RemovedLiquidity(_token, _amount, result);
    }
}
