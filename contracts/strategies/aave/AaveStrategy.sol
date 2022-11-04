// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../../yieldbox/contracts/strategies/BaseStrategy.sol';

import './ILendingPool.sol';

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

//TODO: decide if we need to start with ETH and wrap it into WETH; stargate allows ETH. not WETH, while others allow WETH, not ETH
//TODO: handle rewards deposits to yieldbox

//Wrapped-native strategy for AAVE
contract AaveStrategy is BaseERC20Strategy, BoringOwnable {
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    IERC20 public immutable wrappedNative;
    ILendingPool public immutable lendingPool;

    /// @notice Queues tokens up to depositThreshold
    /// @dev When the amount of tokens is greater than the threshold, a deposit operation to AAVE is performed
    uint256 public depositThreshold;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event DepositThreshold(uint256 _old, uint256 _new);
    event AmountQueued(uint256 amount);
    event AmountDeposited(uint256 amount);
    event AmountWithdrawn(address indexed to, uint256 amount);

    // 0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9; aave lending pool ETH

    constructor(
        IYieldBox _yieldBox,
        address _token,
        address _lendingPool
    ) BaseERC20Strategy(_yieldBox, _token) {
        wrappedNative = IERC20(_token);
        lendingPool = ILendingPool(_lendingPool);

        wrappedNative.approve(_lendingPool, type(uint256).max);
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Returns the name of this strategy
    function name() external pure override returns (string memory name_) {
        return 'AAVE';
    }

    /// @notice Returns the description of this strategy
    function description()
        external
        pure
        override
        returns (string memory description_)
    {
        return 'AAVE strategy for wrapped native assets';
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

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev queries 'getUserAccountData' from AAVE and gets the total collateral
    function _currentBalance() internal view override returns (uint256 amount) {
        (amount, , , , , ) = lendingPool.getUserAccountData(address(this));
        uint256 queued = wrappedNative.balanceOf(address(this));
        return amount + queued;
    }

    /// @dev deposits to AAVE or queues tokens if the 'depositThreshold' has not been met yet
    ///      - when depositing to AAVE, aToken is minted to this contract
    function _deposited(uint256 amount) internal override {
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (queued > depositThreshold) {
            lendingPool.deposit(
                address(wrappedNative),
                queued,
                address(this),
                0
            );
            emit AmountDeposited(queued);
            return;
        }
        emit AmountQueued(amount);
    }

    /// @dev burns aToken in exchange of Token and withdraws from AAVE LendingPool
    function _withdraw(address to, uint256 amount) internal override {
        uint256 available = _currentBalance();
        require(available >= amount, 'AaveStrategy: amount not valid');

        uint256 queued = wrappedNative.balanceOf(address(this));
        if (amount > queued) {
            uint256 toWithdraw = amount - queued;
            lendingPool.withdraw(address(wrappedNative), toWithdraw, address(this));
        } 

        wrappedNative.safeTransfer(to, amount);
        emit AmountWithdrawn(to, amount);
    }
}
