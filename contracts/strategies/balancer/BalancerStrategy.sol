// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../../yieldbox/contracts/strategies/BaseStrategy.sol';
import '../../swappers/NonYieldBoxMultiSwapper.sol';

import './IBalancerGauge.sol';
import './IBalancerVault.sol';
import './IComposableStablePool.sol';

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

contract BalancerStrategy is BaseERC20Strategy, BoringOwnable, ReentrancyGuard {
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    IERC20 public immutable wrappedNative;
    NonYieldBoxMultiSwapper public swapper;

    bytes32 public poolId;
    IBalancerVault public immutable vault;
    IComposableStablePool public immutable stablePool; //lp token
    IBalancerGauge public immutable gauge;
    uint256 public noOfRewardTokens;
    address[] public rewardTokens;

    /// @notice Queues tokens up to depositThreshold
    /// @dev When the amount of tokens is greater than the threshold, a deposit operation to Yearn is performed
    uint256 public depositThreshold;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event MultiSwapper(address indexed _old, address indexed _new);
    event RewardTokens(uint256 _count);
    event DepositThreshold(uint256 _old, uint256 _new);
    event AmountQueued(uint256 amount);
    event AmountDeposited(uint256 amount);
    event AmountWithdrawn(address indexed to, uint256 amount);

    constructor(
        IYieldBox _yieldBox,
        address _token,
        address _vault,
        address _gauge,
        bytes32 _poolId,
        uint256 _noOfRewardTokens,
        address _multiSwapper
    ) BaseERC20Strategy(_yieldBox, _token) {
        wrappedNative = IERC20(_token);
        swapper = NonYieldBoxMultiSwapper(_multiSwapper);

        vault = IBalancerVault(_vault);
        gauge = IBalancerGauge(_gauge);
        poolId = _poolId;

        (address _stablePool, ) = vault.getPool(_poolId);
        stablePool = IComposableStablePool(_stablePool);

        require(
            gauge.lp_token() == _stablePool,
            'BalancerStrategy: params not valid'
        );

        noOfRewardTokens = _noOfRewardTokens;
        for (uint256 i = 0; i < noOfRewardTokens; i++) {
            rewardTokens.push(gauge.reward_tokens(i));
            IERC20(gauge.reward_tokens(i)).approve(
                _multiSwapper,
                type(uint256).max
            );
        }

        wrappedNative.approve(_vault, type(uint256).max);
        stablePool.approve(_vault, type(uint256).max);
        stablePool.approve(_gauge, type(uint256).max);
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Returns the name of this strategy
    function name() external pure override returns (string memory name_) {
        return 'Balancer';
    }

    /// @notice Returns the description of this strategy
    function description()
        external
        pure
        override
        returns (string memory description_)
    {
        return 'Balancer strategy for wrapped native assets';
    }

    /// @notice returns compounded amounts in wrappedNative
    function compoundAmount() public view returns (uint256 result) {
        result = 0;
        for (uint256 i = 0; i < noOfRewardTokens; i++) {
            result += _compoundAmountForToken(rewardTokens[i]);
        }
    }

    function _compoundAmountForToken(address _token)
        private
        view
        returns (uint256 result)
    {
        uint256 claimable = gauge.claimable_reward(address(this), _token);
        result = 0;
        if (claimable > 0) {
            address[] memory path = new address[](2); //todo: check if path is right
            path[0] = _token;
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

        for (uint256 i = 0; i < noOfRewardTokens; i++) {
            IERC20(rewardTokens[i]).approve(address(swapper), 0);
            IERC20(rewardTokens[i]).approve(_swapper, type(uint256).max);
        }

        swapper = NonYieldBoxMultiSwapper(_swapper);
    }

    function setNoOfRewardTokens(uint256 _noOfRewardTokens) external onlyOwner {
        delete rewardTokens;
        noOfRewardTokens = _noOfRewardTokens;
        for (uint256 i = 0; i < noOfRewardTokens; i++) {
            rewardTokens.push(gauge.reward_tokens(i));
        }
        emit RewardTokens(_noOfRewardTokens);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    function compound(bool _tryStake) public {
        gauge.claim_rewards(address(this), address(this));

        for (uint256 i = 0; i < noOfRewardTokens; i++) {
            compoundToken(rewardTokens[i]);
        }

        //stake if > depositThreshold
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (_tryStake && queued > depositThreshold) {
            uint256 obtainedLp = _vaultDeposit(queued);
            _gaugeDeposit(obtainedLp);
            emit AmountDeposited(queued);
            return;
        }
    }

    function compoundToken(address _token) private {
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        if (tokenBalance > 0) {
            //swap reward token  to wrappedNative
            address[] memory path = new address[](2);
            path[0] = _token;
            path[1] = address(wrappedNative);
            uint256 calcAmount = swapper.getOutputAmount(path, tokenBalance);
            uint256 minAmount = (calcAmount * 2_500) / 10_000; //2.5%
            swapper.swap(
                _token,
                address(wrappedNative),
                minAmount,
                address(this),
                path,
                tokenBalance
            );
        }
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _currentBalance() internal view override returns (uint256 amount) {
        uint256 lpBalance = gauge.balanceOf(address(this));
        uint256 exchangeRate = stablePool.getTokenRate(address(wrappedNative));
        uint256 invested = (lpBalance * exchangeRate) /
            IStrictERC20(address(stablePool)).decimals();
        uint256 queued = wrappedNative.balanceOf(address(this));
        uint256 claimableRewards = compoundAmount();
        return invested + queued + claimableRewards;
    }

    /// @dev deposits to Balancer or queues tokens if the 'depositThreshold' has not been met yet
    ///      - when depositing to Balancer, cToken is minted to this contract
    function _deposited(uint256 amount) internal override nonReentrant {
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (queued > depositThreshold) {
            uint256 obtainedLp = _vaultDeposit(queued);
            _gaugeDeposit(obtainedLp);
            emit AmountDeposited(queued);
        }
        emit AmountQueued(amount);
    }

    function _vaultDeposit(uint256 amount) private returns (uint256) {
        uint256 lpBalanceBefore = stablePool.balanceOf(address(this));
        IAsset[] memory assets = new IAsset[](1);
        assets[0] = IAsset(address(wrappedNative));

        uint256[] memory maxAmountsIn = new uint256[](1);
        maxAmountsIn[0] = amount;

        IBalancerVault.JoinPoolRequest memory joinPoolRequest;
        joinPoolRequest.assets = assets;
        joinPoolRequest.maxAmountsIn = maxAmountsIn;
        joinPoolRequest.userData = '0x'; //todo: fill user data
        joinPoolRequest.fromInternalBalance = false;

        vault.joinPool(poolId, address(this), address(this), joinPoolRequest);
        uint256 lpBalanceAfter = stablePool.balanceOf(address(this));
        require(
            lpBalanceAfter > lpBalanceBefore,
            'BalancerStrategy: vault deposit failed'
        );
        return lpBalanceAfter - lpBalanceBefore;
    }

    function _gaugeDeposit(uint256 amount) private {
        gauge.deposit(amount, address(this), false);
    }

    /// @dev burns yToken in exchange of Token and withdraws from Yearn Vault
    function _withdraw(address to, uint256 amount)
        internal
        override
        nonReentrant
    {
        uint256 available = _currentBalance();
        require(available >= amount, 'BalancerStrategy: amount not valid');

        uint256 queued = wrappedNative.balanceOf(address(this));
        if (amount > queued) {
            uint256 pricePerShare = stablePool.getTokenRate(
                address(wrappedNative)
            );
            uint256 decimals = IStrictERC20(address(stablePool)).decimals();
            uint256 toWithdraw = (((amount - queued) * (10**decimals)) /
                pricePerShare);

            _gaugeWithdraw(toWithdraw);
            _vaultWithdraw(toWithdraw); //todo check obtained to protect from over-transferring
        }
        wrappedNative.safeTransfer(to, amount);

        emit AmountWithdrawn(to, amount);
    }

    function _gaugeWithdraw(uint256 amount) private {
        gauge.withdraw(amount, false);
    }

    function _vaultWithdraw(uint256 amount) private returns (uint256) {
        uint256 wrappedNativeBalanceBefore = wrappedNative.balanceOf(
            address(this)
        );
        IAsset[] memory assets = new IAsset[](1);
        assets[0] = IAsset(address(wrappedNative));

        uint256[] memory minAmountsOut = new uint256[](1);
        minAmountsOut[0] = amount;

        IBalancerVault.ExitPoolRequest memory exitRequest; //check values
        exitRequest.assets = assets;
        exitRequest.minAmountsOut = minAmountsOut;
        exitRequest.userData = '0x'; //todo: fill user data
        exitRequest.toInternalBalance = false;

        vault.exitPool(poolId, address(this), payable(this), exitRequest);

        uint256 wrappedNativeBalanceAfter = wrappedNative.balanceOf(
            address(this)
        );

        require(
            wrappedNativeBalanceAfter > wrappedNativeBalanceBefore,
            'BalancerStrategy: vault withdrawal failed'
        );

        return wrappedNativeBalanceAfter - wrappedNativeBalanceBefore;
    }

    receive() external payable {}
}
