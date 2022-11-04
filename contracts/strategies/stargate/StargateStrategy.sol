// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../../yieldbox/contracts/strategies/BaseStrategy.sol';

import './IRouter.sol';
import './IRouterETH.sol';
import './ILPStaking.sol';

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

//Native strategy for Stargate
contract StargateStrategy is BaseNativeStrategy, BoringOwnable {
    // ************ //
    // *** VARS *** //
    // ************ //
    IRouterETH public immutable addLiquidityRouter;
    IRouter public immutable router;
    ILPStaking public immutable lpStaking;

    uint256 public lpStakingPid;
    uint256 public lpRouterPid;
    IERC20 public stgNative;

    /// @notice Queues tokens up to depositThreshold
    /// @dev When the amount of tokens is greater than the threshold, a deposit operation to Stargate is performed
    uint256 public depositThreshold;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event DepositThreshold(uint256 _old, uint256 _new);
    event AmountQueued(uint256 amount);
    event AmountDeposited(uint256 amount);
    event AmountWithdrawn(address indexed to, uint256 amount);

    constructor(
        IYieldBox _yieldBox,
        uint256 _tokenId,
        address _ethRouter,
        address _lpStaking,
        uint256 _stakingPid,
        address _lpToken
    ) BaseNativeStrategy(_yieldBox, _tokenId) {
        addLiquidityRouter = IRouterETH(_ethRouter);
        lpStaking = ILPStaking(_lpStaking);
        lpStakingPid = _stakingPid;

        router = IRouter(addLiquidityRouter.stargateRouter());
        lpRouterPid = addLiquidityRouter.poolId();

        stgNative = IERC20(_lpToken);
        stgNative.approve(_lpStaking, type(uint256).max);
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
        return 'Stargate strategy for native assets';
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
    /// @dev queries 'getUserAccountData' from Stargate and gets the total collateral
    function _currentBalance() internal view override returns (uint256 amount) {
        uint256 queued = address(this).balance;
        (amount, ) = lpStaking.userInfo(address(this));
        return amount + queued;
    }

    /// @dev deposits to Stargate or queues tokens if the 'depositThreshold' has not been met yet
    ///      - when depositing to Stargate, aToken is minted to this contract
    function _deposited(uint256 amount) internal override {
        uint256 queued = address(this).balance;
        if (queued > depositThreshold) {
            addLiquidityRouter.addLiquidityETH{value: queued}();
            uint256 toStake = stgNative.balanceOf(address(this));
            lpStaking.deposit(lpStakingPid, toStake);
            emit AmountDeposited(queued);
            return;
        }
        emit AmountQueued(amount);
    }

    /// @dev burns stgToken in exchange of Native and withdraws from Stargate Staking & Router
    function _withdraw(address to, uint256 amount) internal override {
        uint256 available = _currentBalance();
        require(available >= amount, 'StargateStrategy: amount not valid');

        uint256 queued = address(this).balance;
        if (amount > queued) {
            uint256 toWithdraw = amount - queued;
            lpStaking.withdraw(lpStakingPid, toWithdraw);
            router.instantRedeemLocal(uint16(lpRouterPid), toWithdraw, address(this));
        }

        safeTransferETH(to, amount);
        emit AmountWithdrawn(to, amount);
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'StargateStrategy: ETH transfer failed');
    }

    receive() external payable {}
}
