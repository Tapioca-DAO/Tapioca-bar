// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../../yieldbox/contracts/strategies/BaseStrategy.sol';
import '../../swappers/NonYieldBoxMultiSwapper.sol';
import '../curve/ITricryptoLPGetter.sol';

import './IConvexBooster.sol';
import './IConvexRewardPool.sol';
import './IConvexZap.sol';

import 'hardhat/console.sol';

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

contract ConvexTricryptoStrategy is
    BaseERC20Strategy,
    BoringOwnable,
    ReentrancyGuard
{
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    IERC20 public immutable wrappedNative;
    NonYieldBoxMultiSwapper public swapper;

    ITricryptoLPGetter public lpGetter;
    IConvexBooster public immutable booster;
    IConvexRewardPool public immutable rewardPool;
    IConvexZap public immutable zap;
    uint256 public immutable pid;

    IERC20 public immutable lpToken;
    // IERC20 public immutable receiptToken;
    IERC20 public immutable rewardToken;

    /// @notice Queues tokens up to depositThreshold
    /// @dev When the amount of tokens is greater than the threshold, a deposit operation to AAVE is performed
    uint256 public depositThreshold;

    struct ClaimTempData {
        address[] rewardContracts;
        address[] extraRewardContracts;
        address[] tokenRewardContracts;
        address[] tokens;
        address[] tokenRewardTokens;
        bytes extras;
    }
    struct ClaimExtrasTempData {
        uint256 depositCrvMaxAmount;
        uint256 minAmountOut;
        uint256 depositCvxMaxAmount;
        uint256 spendCvxAmount;
        uint256 options;
    }

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event MultiSwapper(address indexed _old, address indexed _new);
    event DepositThreshold(uint256 _old, uint256 _new);
    event LPGetterSet(address indexed _old, address indexed _new);
    event AmountQueued(uint256 amount);
    event AmountDeposited(uint256 amount);
    event AmountWithdrawn(address indexed to, uint256 amount);

    constructor(
        IYieldBox _yieldBox,
        address _token,
        address _booster,
        address _zap,
        address _lpGetter,
        uint256 _pid,
        address _multiSwapper
    ) BaseERC20Strategy(_yieldBox, _token) {
        wrappedNative = IERC20(_token);
        swapper = NonYieldBoxMultiSwapper(_multiSwapper);

        pid = _pid;
        zap = IConvexZap(_zap);
        booster = IConvexBooster(_booster);
        lpGetter = ITricryptoLPGetter(_lpGetter);
        rewardPool = IConvexRewardPool(booster.poolInfo(pid).crvRewards);

        lpToken = IERC20(booster.poolInfo(pid).lptoken);
        // receiptToken = IERC20(booster.poolInfo(pid).token);
        rewardToken = IERC20(rewardPool.rewardToken());

        wrappedNative.approve(_lpGetter, type(uint256).max);
        lpToken.approve(_lpGetter, type(uint256).max);
        lpToken.approve(_booster, type(uint256).max);
        rewardToken.approve(_multiSwapper, type(uint256).max);
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Returns the name of this strategy
    function name() external pure override returns (string memory name_) {
        return 'Convex-Tricrypto';
    }

    /// @notice Returns the description of this strategy
    function description()
        external
        pure
        override
        returns (string memory description_)
    {
        return 'Convex-Tricrypto strategy for wrapped native assets';
    }

    /// @notice returns compounded amounts in wrappedNative
    function compoundAmount() public view returns (uint256 result) {
        uint256 claimable = rewardPool.rewards(address(this));
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
        rewardToken.approve(address(swapper), 0);
        swapper = NonYieldBoxMultiSwapper(_swapper);
        rewardToken.approve(_swapper, type(uint256).max);
    }

    /// @notice Sets the Tricrypto LP Getter
    /// @param _lpGetter the new address
    function setTricryptoLPGetter(address _lpGetter) external onlyOwner {
        emit LPGetterSet(address(lpGetter), _lpGetter);
        wrappedNative.approve(address(lpGetter), 0);
        lpGetter = ITricryptoLPGetter(_lpGetter);
        wrappedNative.approve(_lpGetter, type(uint256).max);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    function compound(bool _tryStake, bytes memory data) public {
        if (data.length == 0) return;
        (uint256[] memory rewards, address[] memory tokens) = _executeClaim(
            data
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            if (rewards[i] > 0) {
                IERC20(tokens[i]).approve(address(swapper), rewards[i]);
                address[] memory path = new address[](2); //todo: check if path is right
                path[0] = tokens[i];
                path[1] = address(wrappedNative);
                uint256 calcAmount = swapper.getOutputAmount(path, rewards[i]);
                uint256 minAmount = (calcAmount * 2_500) / 10_000; //2.5%
                swapper.swap(
                    tokens[i],
                    address(wrappedNative),
                    minAmount,
                    address(this),
                    path,
                    rewards[i]
                );
            }
        }

        uint256 queued = wrappedNative.balanceOf(address(this));
        if (_tryStake && queued > depositThreshold) {
            _addLiquidityAndStake(queued);
            emit AmountDeposited(queued);
        }
    }

    function _executeClaim(bytes memory data)
        private
        returns (uint256[] memory, address[] memory)
    {
        ClaimTempData memory tempData;

        (
            tempData.rewardContracts,
            tempData.extraRewardContracts,
            tempData.tokenRewardContracts,
            tempData.tokens,
            tempData.tokenRewardTokens,
            tempData.extras
        ) = abi.decode(
            data,
            (address[], address[], address[], address[], address[], bytes)
        );
        ClaimExtrasTempData memory extrasTempData;
        (
            extrasTempData.depositCrvMaxAmount,
            extrasTempData.minAmountOut,
            extrasTempData.depositCvxMaxAmount,
            extrasTempData.spendCvxAmount,
            extrasTempData.options
        ) = abi.decode(
            tempData.extras,
            (uint256, uint256, uint256, uint256, uint256)
        );

        require(
            tempData.rewardContracts.length == tempData.tokens.length,
            'ConvexTricryptoStrategy: claim data not valid'
        );
        require(
            tempData.rewardContracts.length > 0,
            'ConvexTricryptoStrategy: nothing to claim for'
        );

        uint256[] memory balancesBefore = new uint256[](tempData.tokens.length);
        for (uint256 i = 0; i < tempData.tokens.length; i++) {
            balancesBefore[i] = IERC20(tempData.tokens[i]).balanceOf(
                address(this)
            );
        }

        zap.claimRewards(
            tempData.rewardContracts,
            tempData.extraRewardContracts,
            tempData.tokenRewardContracts,
            tempData.tokenRewardTokens,
            extrasTempData.depositCrvMaxAmount,
            extrasTempData.minAmountOut,
            extrasTempData.depositCvxMaxAmount,
            extrasTempData.spendCvxAmount,
            extrasTempData.options
        );
        uint256[] memory balancesAfter = new uint256[](tempData.tokens.length);
        for (uint256 i = 0; i < tempData.tokens.length; i++) {
            balancesAfter[i] = IERC20(tempData.tokens[i]).balanceOf(
                address(this)
            );
        }

        uint256[] memory finalBalances = new uint256[](tempData.tokens.length);
        for (uint256 i = 0; i < tempData.tokens.length; i++) {
            finalBalances[i] = balancesAfter[i] - balancesBefore[i];
        }

        return (finalBalances, tempData.tokens);
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev queries total staked
    function _currentBalance() internal view override returns (uint256 amount) {
        uint256 lpBalance = rewardPool.balanceOf(address(this));
        uint256 assetAmount = lpGetter.calcLpToWeth(lpBalance);
        uint256 queued = wrappedNative.balanceOf(address(this));
        uint256 _compoundAmount = compoundAmount();
        return assetAmount + queued + _compoundAmount;
    }

    /// @dev deposits to Curve Tricrypto to get the LP and stakes it into Convex
    function _deposited(uint256 amount) internal override nonReentrant {
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (queued > depositThreshold) {
            _addLiquidityAndStake(queued);
            emit AmountDeposited(queued);
            return;
        }
        emit AmountQueued(amount);
    }

    function _addLiquidityAndStake(uint256 amount) private {
        uint256 calcAmount = lpGetter.calcWethToLp(amount);
        uint256 minAmount = (calcAmount * 2_500) / 10_000; //2.5%
        uint256 lpAmount = lpGetter.addLiquidityWeth(amount, minAmount);

        booster.deposit(pid, lpAmount, true);
    }

    /// @dev unstakes from Convex and withdraws from Curve
    function _withdraw(address to, uint256 amount)
        internal
        override
        nonReentrant
    {
        uint256 available = _currentBalance();
        require(
            available >= amount,
            'ConvexTricryptoStrategy: amount not valid'
        );

        uint256 queued = wrappedNative.balanceOf(address(this));
        if (amount > queued) {
            compound(false, bytes(''));
            uint256 lpBalance = rewardPool.balanceOf(address(this));
            rewardPool.withdrawAndUnwrap(lpBalance, false);
            uint256 calcWithdraw = lpGetter.calcLpToWeth(lpBalance);
            uint256 minAmount = (calcWithdraw * 2_500) / 10_000; //2.5%
            uint256 assetAmount = lpGetter.removeLiquidityWeth(
                lpBalance,
                minAmount
            );
            require(
                assetAmount + queued >= amount,
                'ConvexTricryptoStrategy: not enough'
            );
        }

        wrappedNative.safeTransfer(to, amount);

        queued = wrappedNative.balanceOf(address(this));
        if (queued > 0) {
            _addLiquidityAndStake(queued);
            emit AmountDeposited(queued);
        }
        emit AmountWithdrawn(to, amount);
    }
}
