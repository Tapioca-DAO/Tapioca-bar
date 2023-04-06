// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';

import '../../yieldbox/contracts/enums/YieldBoxTokenType.sol';
import '../../yieldbox/contracts/strategies/BaseStrategy.sol';

import '../interfaces/IFeeCollector.sol';
import '../interfaces/gmx/IGlpManager.sol';
import '../interfaces/gmx/IGmxRewardDistributor.sol';
import '../interfaces/gmx/IGmxRewardRouter.sol';
import '../interfaces/gmx/IGmxRewardTracker.sol';
import '../interfaces/gmx/IGmxVester.sol';
import '../interfaces/gmx/IGmxVault.sol';

// NOTE: Specific to a UniV3 pool!! This will not work on Avalanche!
contract GlpStrategy is BaseERC20Strategy, BoringOwnable {
    using BoringERC20 for IERC20;

    string public constant override name = 'sGLP';
    string public constant override description =
        'Holds staked GLP tokens and compounds the rewards';

    IERC20 private immutable gmx;
    IERC20 private immutable esGmx;
    IERC20 private immutable weth;

    IGmxRewardTracker private immutable feeGmxTracker;
    IGlpManager private immutable glpManager;
    IGmxRewardRouterV2 private immutable glpRewardRouter;
    IGmxRewardRouterV2 private immutable gmxRewardRouter;
    IGmxVester private immutable glpVester;
    IGmxVester private immutable gmxVester;
    IGmxRewardTracker private immutable stakedGlpTracker;
    IGmxRewardTracker private immutable stakedGmxTracker;

    IUniswapV3Pool private constant gmxWethPool =
        IUniswapV3Pool(0x80A9ae39310abf666A87C743d6ebBD0E8C42158E);
    uint160 internal constant UNI_MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant UNI_MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723970342;

    uint256 internal constant FEE_BPS = 100;
    address public feeRecipient;
    uint256 public feesPending;

    constructor(
        IYieldBox _yieldBox,
        IGmxRewardRouterV2 _gmxRewardRouter,
        IGmxRewardRouterV2 _glpRewardRouter,
        IERC20 _sGlp
    ) BaseERC20Strategy(_yieldBox, address(_sGlp)) {
        weth = IERC20(_yieldBox.wrappedNative());
        require(address(weth) == _gmxRewardRouter.weth(), 'WETH mismatch');

        require(_glpRewardRouter.gmx() == address(0), 'Bad GLP reward router');
        glpRewardRouter = _glpRewardRouter;

        address _gmx = _gmxRewardRouter.gmx();
        require(_gmx != address(0), 'Bad GMX reward router');
        gmxRewardRouter = _gmxRewardRouter;
        gmx = IERC20(_gmx);
        esGmx = IERC20(_gmxRewardRouter.esGmx());

        stakedGlpTracker = IGmxRewardTracker(
            glpRewardRouter.stakedGlpTracker()
        );
        stakedGmxTracker = IGmxRewardTracker(
            gmxRewardRouter.stakedGmxTracker()
        );
        feeGmxTracker = IGmxRewardTracker(gmxRewardRouter.feeGmxTracker());
        glpManager = IGlpManager(glpRewardRouter.glpManager());
        glpVester = IGmxVester(gmxRewardRouter.glpVester());
        gmxVester = IGmxVester(gmxRewardRouter.gmxVester());

        feeRecipient = owner;
    }

    // (For the GMX-ETH pool)
    function uniswapV3SwapCallback(
        int256 /* amount0Delta */,
        int256 /* amount1Delta */,
        bytes calldata data
    ) external {
        require(msg.sender == address(gmxWethPool), 'Not the pool');
        uint256 amount = abi.decode(data, (uint256));
        gmx.safeTransfer(address(gmxWethPool), amount);
    }

    function harvest() public {
        _claimRewards();
        _buyGlp();
        _vestByGlp();
        _stakeEsGmx();
        _vestByEsGmx();
    }

    function harvestGmx(uint256 priceNum, uint256 priceDenom) public onlyOwner {
        _claimRewards();
        _sellGmx(priceNum, priceDenom);
        _buyGlp();
        _vestByGlp();
        _stakeEsGmx();
        _vestByEsGmx();
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        feeRecipient = recipient;
    }

    function withdrawFees() external {
        uint256 feeAmount = feesPending;
        if (feeAmount > 0) {
            uint256 wethAmount = weth.balanceOf(address(this));
            if (wethAmount < feeAmount) {
                feeAmount = wethAmount;
            }
            weth.safeTransfer(feeRecipient, feeAmount);
            feesPending -= feeAmount;
        }
    }

    function _currentBalance() internal view override returns (uint256 amount) {
        // This _should_ included both free and "reserved" GLP:
        amount = IERC20(contractAddress).balanceOf(address(this));
    }

    function _deposited(uint256 /* amount */) internal override {
        harvest();
    }

    function _withdraw(address to, uint256 amount) internal override {
        _claimRewards();
        _buyGlp();
        uint256 freeGlp = stakedGlpTracker.balanceOf(address(this));
        if (freeGlp < amount) {
            // Reverts if none are vesting, but in that case the whole TX will
            // revert anyway for withdrawing too much:
            glpVester.withdraw();
        }
        // Call this first; `_vestByGlp()` will lock the GLP again
        IERC20(contractAddress).safeTransfer(to, amount);
        _vestByGlp();
        _stakeEsGmx();
        _vestByEsGmx();
    }

    function _claimRewards() private {
        gmxRewardRouter.handleRewards({
            _shouldClaimGmx: true,
            _shouldStakeGmx: false,
            _shouldClaimEsGmx: true,
            _shouldStakeEsGmx: false,
            _shouldStakeMultiplierPoints: true,
            _shouldClaimWeth: true,
            _shouldConvertWethToEth: false
        });
    }

    function _buyGlp() private {
        uint256 wethAmount = weth.balanceOf(address(this));
        uint256 _feesPending = feesPending;
        if (wethAmount > _feesPending) {
            wethAmount -= _feesPending;
            uint256 fee = wethAmount * FEE_BPS / 10_000;
            feesPending = _feesPending + fee;
            wethAmount -= fee;

            weth.approve(address(glpManager), wethAmount);
            glpRewardRouter.mintAndStakeGlp(address(weth), wethAmount, 0, 0);
        }
    }

    /// @dev Underreports if not all vesting claims have been made.
    function _getVestableAmount(
        IGmxVester vester,
        uint256 available,
        uint256 tokenAvailable
    ) private view returns (uint256) {
        if (available == 0) {
            return 0;
        }

        uint256 totalVestable = vester.getMaxVestableAmount(address(this));
        uint256 vestingNow = vester.balances(address(this));
        uint256 alreadyVested = vester.cumulativeClaimAmounts(address(this));
        uint256 vestable = totalVestable - vestingNow - alreadyVested;
        if (vestable == 0) {
            return 0;
        }

        if (available < vestable) {
            vestable = available;
        }

        // Make sure we meet the "reserved" amount. In the following, "token"
        // means the thing we need to reserve; either GLP or (GMX+esGMX+MPs):
        uint256 avgTokenStake = vester.getCombinedAverageStakedAmount(
            address(this)
        );
        uint256 minTokenReserve = ((vestingNow + vestable) * avgTokenStake) /
            totalVestable;
        uint256 tokenReserved = vester.pairAmounts(address(this));
        tokenAvailable += tokenReserved;
        if (tokenAvailable < minTokenReserve) {
            // What amount can we vest that will still pass the check?
            //
            // The equation used to check is of the form
            //
            // floor(C(A+B) / D) <= X,
            //
            // where
            //     A = vestingNow
            //     B = vestable
            //     C = avgTokenStake,
            //     D = totalVestable,
            //     X = tokenAvailable,
            //
            // and we control B. If we overestimate, the transaction will
            // revert, so we make sure every step here results in a stricter or
            // equal upper bound:
            //
            // floor(C(A+B) / D) <= X,
            //        C(A+B) / D <= X         (remove rounding that favored us)
            //            C(A+B) <= DX
            //               A+B <= DX / C
            //               A+B <= floor(DX / C)  (add rounding that costs us)
            //                 B <= floor(DX / C) - A
            //
            // OK, we're safe:
            //
            // (TODO: Check that the multiplication does not overflow!)
            //
            // No DBZ: totalVestable is zero if there are no tokens staked
            // (TODO: Check edge case where the average calculation drops to
            // zero?)
            vestable =
                (totalVestable * tokenAvailable) /
                avgTokenStake -
                vestingNow;
        }
        return vestable;
    }

    /// @dev Assumes all vestable tokens have been claimed
    /// @dev May withdraw all from the vest-by-esGMX vault (to unstake esGMX)
    function _vestByGlp() private {
        uint256 freeEsGmx = esGmx.balanceOf(address(this));
        uint256 stakedEsGmx = stakedGmxTracker.depositBalances(
            address(this),
            address(esGmx)
        );
        uint256 available = freeEsGmx + stakedEsGmx;
        uint256 vestable = _getVestableAmount(
            glpVester,
            available,
            stakedGlpTracker.balanceOf(address(this))
        );
        if (vestable == 0) {
            return;
        }

        if (vestable > freeEsGmx) {
            // Reverts if the total of (tokens vesting) + (tokens claimable) is
            // zero, which is possible if the reward distributor ran out of
            // esGMX. Rather than calculating this twice, let the call fail:
            try gmxVester.withdraw() {} catch {}
            gmxRewardRouter.unstakeEsGmx(vestable - freeEsGmx);
        }

        glpVester.deposit(vestable);
    }

    function _vestByEsGmx() private {
        uint256 freeEsGmx = esGmx.balanceOf(address(this));
        // As "reserved token" we can use:
        // - staked esGMX
        // - staked Multiplier Points
        // - (staked GMX, but we don't have this)
        // The following counts all staked, but not currently used for vesting,
        // tokens -- reserved tokens are transferred to the vester contract:
        uint256 unusedStakedTokens = feeGmxTracker.balanceOf(address(this));
        uint256 vestable = _getVestableAmount(
            gmxVester,
            freeEsGmx,
            unusedStakedTokens
        );
        if (vestable == 0) {
            return;
        }

        gmxVester.deposit(vestable);
    }

    function _stakeEsGmx() private {
        uint256 freeEsGmx = esGmx.balanceOf(address(this));
        // This counts all esGMX that we staked (here); "reserved" or not
        uint256 stakedEsGmx = stakedGmxTracker.depositBalances(
            address(this),
            address(esGmx)
        );
        // Frequent staking and unstaking costs us "Multiplier Points".
        // Aim for 95% staked to handle fluctuations in GLP balance:
        uint256 buffer = (freeEsGmx + stakedEsGmx) / 20;
        if (freeEsGmx > buffer) {
            gmxRewardRouter.stakeEsGmx(freeEsGmx - buffer);
        }
    }

    function _sellGmx(uint256 priceNum, uint256 priceDenom) private {
        uint256 gmxAmount = gmx.balanceOf(address(this));
        if (gmxAmount == 0) {
            return;
        }

        bool zeroForOne = address(gmx) < address(weth);

        (int256 amount0, int256 amount1) = gmxWethPool.swap(
            address(this),
            zeroForOne,
            int256(gmxAmount),
            (zeroForOne ? UNI_MIN_SQRT_RATIO + 1 : UNI_MAX_SQRT_RATIO - 1),
            abi.encode(gmxAmount)
        );
        // TODO: Check the cast?
        uint256 amountOut = uint256(-(zeroForOne ? amount1 : amount0));
        require(amountOut * priceDenom >= gmxAmount * priceNum, 'Not enough');
    }
}
