// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../../yieldbox/contracts/strategies/BaseStrategy.sol';

import './ITricryptoLPGetter.sol';
import './ITricryptoLPGauge.sol';

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

contract TricryptoStrategy is
    BaseERC20Strategy,
    BoringOwnable,
    ReentrancyGuard
{
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    IERC20 public immutable wrappedNative;
    ITricryptoLPGauge public immutable lpGauge;
    ITricryptoLPGetter public lpGetter;

    /// @notice Queues tokens up to depositThreshold
    /// @dev When the amount of tokens is greater than the threshold, a deposit operation to AAVE is performed
    uint256 public depositThreshold;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event DepositThreshold(uint256 _old, uint256 _new);
    event LPGetterSet(address indexed _old, address indexed _new);
    event AmountQueued(uint256 amount);
    event AmountDeposited(uint256 amount);
    event AmountWithdrawn(address indexed to, uint256 amount);

    constructor(
        IYieldBox _yieldBox,
        address _token,
        address _lpGauge,
        address _lpGetter
    ) BaseERC20Strategy(_yieldBox, _token) {
        wrappedNative = IERC20(_token);
        lpGauge = ITricryptoLPGauge(_lpGauge);
        lpGetter = ITricryptoLPGetter(_lpGetter);

        IERC20(lpGetter.lpToken()).approve(_lpGauge, type(uint256).max);
        IERC20(lpGetter.lpToken()).approve(_lpGetter, type(uint256).max);
        wrappedNative.approve(_lpGetter, type(uint256).max);
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Returns the name of this strategy
    function name() external pure override returns (string memory name_) {
        return 'Curve-Tricrypto';
    }

    /// @notice Returns the description of this strategy
    function description()
        external
        pure
        override
        returns (string memory description_)
    {
        return 'Curve-Tricrypto strategy for wrapped native assets';
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice Sets the deposit threshold
    /// @param amount The new threshold amount
    function setDepositThreshold(uint256 amount) external onlyOwner {
        emit DepositThreshold(depositThreshold, amount);
        depositThreshold = amount;
    }

    /// @notice Sets the Tricrypto LP Getter
    /// @param _lpGetter the new address
    function setTricryptoLPGetter(address _lpGetter) external onlyOwner {
        emit LPGetterSet(address(lpGetter), _lpGetter);
        wrappedNative.approve(address(lpGetter), 0);
        lpGetter = ITricryptoLPGetter(_lpGetter);
        wrappedNative.approve(_lpGetter, type(uint256).max);
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev queries Curve-Tricrypto Liquidity Pool
    function _currentBalance() internal view override returns (uint256 amount) {
        uint256 lpBalance = lpGauge.balanceOf(address(this));
        uint256 assetAmount = lpGetter.calcLpToWeth(lpBalance);
        uint256 queued = wrappedNative.balanceOf(address(this));
        return assetAmount + queued;
    }

    /// @dev deposits to Curve Tricrypto or queues tokens if the 'depositThreshold' has not been met yet
    function _deposited(uint256 amount) internal override nonReentrant {
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (queued > depositThreshold) {
            _addLiquidityAndStake(queued);
            emit AmountDeposited(queued);
            return;
        }
        emit AmountQueued(amount);
    }

    /// @dev withdraws from Curve Tricrypto
    function _withdraw(address to, uint256 amount)
        internal
        override
        nonReentrant
    {
        uint256 available = _currentBalance();
        require(available >= amount, 'TricryptoStrategy: amount not valid');

        uint256 queued = wrappedNative.balanceOf(address(this));
        if (amount > queued) {
            uint256 lpBalance = lpGauge.balanceOf(address(this));
            lpGauge.withdraw(lpBalance, true);
            uint256 calcWithdraw = lpGetter.calcLpToWeth(lpBalance);
            uint256 minAmount = (calcWithdraw * 2_500) / 10_000; //2.5%
            uint256 assetAmount = lpGetter.removeLiquidityWeth(
                lpBalance,
                minAmount
            );
            require(
                assetAmount + queued >= amount,
                'TricryptoStrategy: not enough'
            );
        }

        wrappedNative.safeTransfer(to, amount);

        queued = wrappedNative.balanceOf(address(this));
        if (queued > 0) {
            _addLiquidityAndStake(queued);
        }
        emit AmountWithdrawn(to, amount);
    }

    function _addLiquidityAndStake(uint256 amount) private {
        uint256 calcAmount = lpGetter.calcWethToLp(amount);
        uint256 minAmount = (calcAmount * 2_500) / 10_000; //2.5%
        uint256 lpAmount = lpGetter.addLiquidityWeth(amount, minAmount);
        lpGauge.deposit(lpAmount, address(this), false);
    }
}
