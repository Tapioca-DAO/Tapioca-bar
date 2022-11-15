// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../../yieldbox/contracts/strategies/BaseStrategy.sol';
import '../../swappers/NonYieldBoxMultiSwapper.sol';

import './ILendingPool.sol';
import './IIncentivesController.sol';
import './IStkAave.sol';

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

//Wrapped-native strategy for AAVE
contract AaveStrategy is BaseERC20Strategy, BoringOwnable, ReentrancyGuard {
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    IERC20 public immutable wrappedNative;
    NonYieldBoxMultiSwapper public swapper;

    //AAVE
    IStkAave public immutable stakedRewardToken;
    IERC20 public immutable rewardToken;
    IERC20 public immutable receiptToken;
    ILendingPool public immutable lendingPool;
    IIncentivesController public immutable incentivesController;

    /// @notice Queues tokens up to depositThreshold
    /// @dev When the amount of tokens is greater than the threshold, a deposit operation to AAVE is performed
    uint256 public depositThreshold;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event MultiSwapper(address indexed _old, address indexed _new);
    event DepositThreshold(uint256 _old, uint256 _new);
    event AmountQueued(uint256 amount);
    event AmountDeposited(uint256 amount);
    event AmountWithdrawn(address indexed to, uint256 amount);

    // 0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9; aave lending pool ETH

    constructor(
        IYieldBox _yieldBox,
        address _token,
        address _lendingPool,
        address _incentivesController,
        address _receiptToken,
        address _multiSwapper
    ) BaseERC20Strategy(_yieldBox, _token) {
        wrappedNative = IERC20(_token);
        swapper = NonYieldBoxMultiSwapper(_multiSwapper);

        lendingPool = ILendingPool(_lendingPool);
        incentivesController = IIncentivesController(_incentivesController);
        stakedRewardToken = IStkAave(incentivesController.REWARD_TOKEN());
        rewardToken = IERC20(stakedRewardToken.REWARD_TOKEN());
        receiptToken = IERC20(_receiptToken);

        wrappedNative.approve(_lendingPool, type(uint256).max);
        rewardToken.approve(_multiSwapper, type(uint256).max);
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

    /// @notice returns compounded amounts in wrappedNative
    function compoundAmount() public view returns (uint256 result) {
        uint256 claimable = stakedRewardToken.stakerRewardsToClaim(
            address(this)
        );
        result = 0;
        if (claimable > 0) {
            address[] memory path = new address[](2); //todo: check if path is right
            path[0] = address(rewardToken);
            path[1] = address(wrappedNative);
            result = swapper.getOutputAmount(path, claimable);
        }
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

    /// @notice Sets the Swapper address
    /// @param _swapper The new swapper address
    function setMultiSwapper(address _swapper) external onlyOwner {
        emit MultiSwapper(address(swapper), _swapper);
        swapper = NonYieldBoxMultiSwapper(_swapper);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    function compound(bool _tryStake) public {
        uint256 aaveBalanceBefore = rewardToken.balanceOf(address(this));
        //first claim stkAave
        uint256 unclaimedStkAave = incentivesController.getUserUnclaimedRewards(
            address(this)
        );

        if (unclaimedStkAave > 0) {
            address[] memory tokens = new address[](1);
            tokens[0] = address(receiptToken);
            incentivesController.claimRewards(
                tokens,
                type(uint256).max,
                address(this)
            );
        }
        //try to claim AAVE
        uint256 claimable = stakedRewardToken.stakerRewardsToClaim(
            address(this)
        );
        if (claimable > 0) {
            stakedRewardToken.claimRewards(address(this), claimable);
        }

        //try to cooldown
        uint256 currentCooldown = stakedRewardToken.stakersCooldowns(
            address(this)
        );
        if (currentCooldown > 0) {
            //we have an active cooldown; check if we need to cooldown again
            bool daysPassed = (currentCooldown + 12 days) < block.timestamp;
            if (daysPassed) {
                stakedRewardToken.cooldown();
            }
        } else {
            stakedRewardToken.cooldown();
        }

        //try to stake
        uint256 aaveBalanceAfter = rewardToken.balanceOf(address(this));
        if (aaveBalanceAfter > aaveBalanceBefore) {
            uint256 aaveAmount = aaveBalanceAfter - aaveBalanceBefore;

            //swap AAVE to wrappedNative
            address[] memory path = new address[](2); //todo: check if path is right
            path[0] = address(rewardToken);
            path[1] = address(wrappedNative);
            uint256 calcAmount = swapper.getOutputAmount(path, aaveAmount);
            uint256 minAmount = (calcAmount * 2_500) / 10_000; //2.5%
            swapper.swap(
                address(rewardToken),
                address(wrappedNative),
                minAmount,
                address(this),
                path,
                aaveAmount
            );

            //stake if > depositThreshold
            uint256 queued = wrappedNative.balanceOf(address(this));
            if (_tryStake && queued > depositThreshold) {
                lendingPool.deposit(
                    address(wrappedNative),
                    queued,
                    address(this),
                    0
                );
                emit AmountDeposited(queued);
                return;
            }
        }
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev queries 'getUserAccountData' from AAVE and gets the total collateral
    function _currentBalance() internal view override returns (uint256 amount) {
        (amount, , , , , ) = lendingPool.getUserAccountData(address(this));
        uint256 queued = wrappedNative.balanceOf(address(this));
        uint256 claimableRewards = compoundAmount();
        return amount + queued + claimableRewards;
    }

    /// @dev deposits to AAVE or queues tokens if the 'depositThreshold' has not been met yet
    ///      - when depositing to AAVE, aToken is minted to this contract
    function _deposited(uint256 amount) internal override nonReentrant {
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
    function _withdraw(address to, uint256 amount)
        internal
        override
        nonReentrant
    {
        uint256 available = _currentBalance();
        require(available >= amount, 'AaveStrategy: amount not valid');

        uint256 queued = wrappedNative.balanceOf(address(this));
        if (amount > queued) {
            compound(false);

            uint256 toWithdraw = amount - queued;

            uint256 obtainedWrapped = lendingPool.withdraw(
                address(wrappedNative),
                toWithdraw,
                address(this)
            );
            if (obtainedWrapped > toWithdraw) {
                amount += (obtainedWrapped - toWithdraw);
            }
        }

        wrappedNative.safeTransfer(to, amount);
        emit AmountWithdrawn(to, amount);
    }
}
