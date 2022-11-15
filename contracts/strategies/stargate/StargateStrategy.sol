// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../../yieldbox/contracts/strategies/BaseStrategy.sol';
import '../../swappers/NonYieldBoxMultiSwapper.sol';

import './IRouter.sol';
import './IRouterETH.sol';
import './ILPStaking.sol';
import '../interfaces/INative.sol';

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

//TODO: decide if we need to start with ETH and wrap it into WETH; stargate allows ETH. not WETH, while others allow WETH, not ETH
//TODO: handle rewards deposits to yieldbox

//Wrapped-native strategy for Stargate
contract StargateStrategy is BaseERC20Strategy, BoringOwnable, ReentrancyGuard {
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    IERC20 public immutable wrappedNative;
    NonYieldBoxMultiSwapper public swapper;

    IRouterETH public immutable addLiquidityRouter;
    IRouter public immutable router;
    ILPStaking public immutable lpStaking;

    uint256 public lpStakingPid;
    uint256 public lpRouterPid;
    IERC20 public stgNative; //ex: stEth
    IERC20 public stgTokenReward;

    /// @notice Queues tokens up to depositThreshold
    /// @dev When the amount of tokens is greater than the threshold, a deposit operation to Stargate is performed
    uint256 public depositThreshold;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event MultiSwapper(address indexed _old, address indexed _new);
    event DepositThreshold(uint256 _old, uint256 _new);
    event AmountQueued(uint256 amount);
    event AmountDeposited(uint256 amount);
    event AmountWithdrawn(address indexed to, uint256 amount);

    constructor(
        IYieldBox _yieldBox,
        address _token,
        address _ethRouter,
        address _lpStaking,
        uint256 _stakingPid,
        address _lpToken,
        address _multiSwapper
    ) BaseERC20Strategy(_yieldBox, _token) {
        wrappedNative = IERC20(_token);
        swapper = NonYieldBoxMultiSwapper(_multiSwapper);

        addLiquidityRouter = IRouterETH(_ethRouter);
        lpStaking = ILPStaking(_lpStaking);
        lpStakingPid = _stakingPid;

        router = IRouter(addLiquidityRouter.stargateRouter());
        lpRouterPid = addLiquidityRouter.poolId();

        stgNative = IERC20(_lpToken);
        stgNative.approve(_lpStaking, type(uint256).max);
        stgNative.approve(address(router), type(uint256).max);

        stgTokenReward = IERC20(lpStaking.stargate());
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Returns the name of this strategy
    function name() external pure override returns (string memory name_) {
        return 'Stargate';
    }

    /// @notice Returns the description of this strategy
    function description()
        external
        pure
        override
        returns (string memory description_)
    {
        return 'Stargate strategy for wrapped native assets';
    }

    /// @notice returns compounded amounts in wrappedNative
    function compoundAmount() public view returns (uint256 result) {
        uint256 claimable = lpStaking.pendingStargate(
            lpStakingPid,
            address(this)
        );
        result = 0;
        if (claimable > 0) {
            address[] memory path = new address[](2);
            path[0] = address(stgTokenReward);
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
        uint256 unclaimed = lpStaking.pendingStargate(
            lpStakingPid,
            address(this)
        );

        if (unclaimed > 0) {
            uint256 stgBalanceBefore = stgTokenReward.balanceOf(address(this));
            lpStaking.deposit(2, 0);
            uint256 stgBalanceAfter = stgTokenReward.balanceOf(address(this));

            if (stgBalanceAfter > stgBalanceBefore) {
                uint256 stgAmount = stgBalanceAfter - stgBalanceBefore;

                address[] memory path = new address[](2); //todo: check if path is right
                path[0] = address(stgTokenReward);
                path[1] = address(wrappedNative);
                uint256 calcAmount = swapper.getOutputAmount(path, stgAmount);
                uint256 minAmount = (calcAmount * 2_500) / 10_000; //2.5%
                swapper.swap(
                    address(stgTokenReward),
                    address(wrappedNative),
                    minAmount,
                    address(this),
                    path,
                    stgAmount
                );

                //stake if > depositThreshold
                uint256 queued = wrappedNative.balanceOf(address(this));
                if (_tryStake && queued > depositThreshold) {
                    _stake(queued);
                }
            }
        }
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @dev queries 'getUserAccountData' from Stargate and gets the total collateral
    function _currentBalance() internal view override returns (uint256 amount) {
        uint256 queued = wrappedNative.balanceOf(address(this));
        (amount, ) = lpStaking.userInfo(address(this));
        uint256 claimableRewards = compoundAmount();
        return amount + queued + claimableRewards;
    }

    /// @dev deposits to Stargate or queues tokens if the 'depositThreshold' has not been met yet
    ///      - when depositing to Stargate, aToken is minted to this contract
    function _deposited(uint256 amount) internal override nonReentrant {
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (queued > depositThreshold) {
            _stake(queued);
        }
        emit AmountQueued(amount);
    }

    function _stake(uint256 amount) private {
        INative(address(wrappedNative)).withdraw(amount);

        addLiquidityRouter.addLiquidityETH{value: amount}();
        uint256 toStake = stgNative.balanceOf(address(this));
        lpStaking.deposit(lpStakingPid, toStake);
        emit AmountDeposited(amount);
    }

    /// @dev burns stgToken in exchange of Native and withdraws from Stargate Staking & Router
    function _withdraw(address to, uint256 amount)
        internal
        override
        nonReentrant
    {
        uint256 available = _currentBalance();
        require(available >= amount, 'StargateStrategy: amount not valid');

        uint256 queued = wrappedNative.balanceOf(address(this));
        if (amount > queued) {
            compound(false);
            uint256 toWithdraw = amount - queued;
            lpStaking.withdraw(lpStakingPid, toWithdraw);
            router.instantRedeemLocal(
                uint16(lpRouterPid),
                toWithdraw,
                address(this)
            );
            INative(address(wrappedNative)).deposit{value: amount}();
        }

        wrappedNative.safeTransfer(to, amount);

        emit AmountWithdrawn(to, amount);
    }

    receive() external payable {}
}
