// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {MarketERC20} from "./MarketERC20.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

abstract contract Market is MarketERC20, Ownable {
    using RebaseLibrary for Rebase;

    // ************ //
    // *** VARS *** //
    // ************ //
    enum PauseType {
        Borrow,
        Repay,
        AddCollateral,
        RemoveCollateral,
        Liquidation,
        LeverageBuy,
        LeverageSell,
        AddAsset,
        RemoveAsset
    }

    /// @notice pause options
    mapping(PauseType pauseProp => bool pauseStatus) internal pauseOptions;
    /// @notice conservator's addresss
    /// @dev conservator can pause/unpause the contract
    address internal conservator;

    /// @notice returns YieldBox address
    IYieldBox internal yieldBox;

    IPearlmit internal pearlmit;

    /// @notice collateral token address
    IERC20 internal collateral;
    /// @notice collateral token YieldBox id
    uint256 internal collateralId;
    /// @notice asset token address
    IERC20 internal asset;
    /// @notice asset token YieldBox id
    uint256 internal assetId;
    /// @notice oracle address
    ITapiocaOracle internal oracle;
    /// @notice oracleData
    bytes internal oracleData;
    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    /// Asset -> collateral = assetAmount * exchangeRate.
    uint256 internal exchangeRate;
    /// @notice cached rate is valid only for the `rateValidDuration` time
    uint256 internal rateValidDuration;
    /// @notice latest timestamp when `exchangeRate` was updated
    uint256 internal rateTimestamp;

    /// @notice total amount borrowed
    /// @dev elastic = Total token amount to be repayed by borrowers, base = Total parts of the debt held by borrowers
    Rebase internal totalBorrow;
    /// @notice total collateral supplied
    uint256 internal totalCollateralShare;
    /// @notice max borrow cap
    uint256 internal totalBorrowCap;
    /// @notice borrow amount per user
    mapping(address => uint256) internal userBorrowPart;
    /// @notice collateral share per user
    mapping(address => uint256) internal userCollateralShare;

    /// @notice accrual protocol rewards
    uint256 internal protocolFee; // 10%
    /// @notice min % a liquidator can receive in rewards
    uint256 internal minLiquidatorReward = 8e4; //80%
    /// @notice max % a liquidator can receive in rewards
    uint256 internal maxLiquidatorReward = 9e4; //90%
    /// @notice max liquidatable bonus amount
    /// @dev max % added to the amount that can be liquidated
    uint256 internal liquidationBonusAmount = 1e4; //10%
    /// @notice collateralization rate
    uint256 internal collateralizationRate; // 75%
    /// @notice liquidation collateralization rate
    uint256 internal liquidationCollateralizationRate; //80%
    /// @notice liquidation multiplier used to compute liquidator rewards
    uint256 internal liquidationMultiplier = 12000; //12%
    /// @notice returns the leverage executor
    ILeverageExecutor internal leverageExecutor;
    /// @notice returns the maximum accepted slippage for liquidation
    uint256 internal maxLiquidationSlippage = 1000; //1%
    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal EXCHANGE_RATE_PRECISION; //not costant, but can only be set in the 'init' method
    uint256 internal constant FEE_PRECISION = 1e5;
    uint256 internal constant FEE_PRECISION_DECIMALS = 5;

    error ExchangeRateNotValid();
    error AllowanceNotValid();

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when `leverageExecutor` is updated
    event LeverageExecutorSet(address oldVal, address newVal);
    /// @notice event emitted when `exchangeRate` validation duration is updated
    event ExchangeRateDurationUpdated(uint256 _oldVal, uint256 _newVal);
    /// @notice event emitted when conservator is updated
    event ConservatorUpdated(address old, address _new);
    /// @notice event emitted when pause state is changed
    event PausedUpdated(PauseType indexed _type, bool oldState, bool newState);
    /// @notice event emitted when cached exchange rate is updated
    event LogExchangeRate(uint256 rate);
    /// @notice event emitted when borrow cap is updated
    event LogBorrowCapUpdated(uint256 _oldVal, uint256 _newVal);
    /// @notice event emitted when oracle data is updated
    event OracleDataUpdated();
    /// @notice event emitted when oracle is updated
    event OracleUpdated(address newAddr);
    /// @notice event emitted when a position is liquidated
    event Liquidated(
        address indexed liquidator,
        address[] users,
        uint256 liquidatorReward,
        uint256 protocolReward,
        uint256 repayedAmount,
        uint256 collateralShareRemoved
    );
    /// @notice event emitted when the liquidation multiplier rate is updated
    event LiquidationMultiplierUpdated(uint256 oldVal, uint256 newVal);
    /// @notice event emitted on setMarketConfig updates
    event ValueUpdated(uint256 valType, uint256 _newVal);
    /// @notice event emitted when then liquidation max slippage is updated
    event LiquidationMaxSlippageUpdated(uint256 oldVal, uint256 newVal);

    modifier optionNotPaused(PauseType _type) {
        require(!pauseOptions[_type], "Market: paused");
        _;
    }

    modifier notSelf(address destination) {
        require(destination != address(this), "Market: cannot execute on itself");
        _;
    }

    /// @dev Checks if the user is solvent in the closed liquidation case at the end of the function body.
    modifier solvent(address from) {
        updateExchangeRate();
        _accrue();

        _;

        require(_isSolvent(from, exchangeRate, false), "Market: insolvent");
    }

    bool internal initialized;

    modifier onlyOnce() {
        require(!initialized, "Market: initialized");
        _;
        initialized = true;
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice updates `leverageExecutor`
    /// @param _executor the new ILeverageExecutor
    function setLeverageExecutor(ILeverageExecutor _executor) external onlyOwner {
        emit LeverageExecutorSet(address(leverageExecutor), address(_executor));
        leverageExecutor = _executor;
    }

    /// @notice updates `maxLiquidationSlippage`
    /// @dev not included in `setMarketConfig` for faster updates
    /// @param _val the new slippage value
    function setLiquidationMaxSlippage(uint256 _val) external onlyOwner {
        require(_val < FEE_PRECISION, "Market: not valid");
        emit LiquidationMaxSlippageUpdated(maxLiquidationSlippage, _val);
        maxLiquidationSlippage = _val;
    }

    /// @notice sets common market configuration
    /// @dev values are updated only if > 0 or not address(0)
    /// @param _oracle oracle address
    /// @param _oracleData oracle data
    /// @param _conservator conservator address; conservator is allowed to pause/unpause the contract
    /// @param _protocolFee protocol fee percentage
    /// @param _liquidationBonusAmount extra amount factored in the closing factor computation
    /// @param _minLiquidatorReward minimum reward percentage a liquidator can receive
    /// @param _maxLiquidatorReward maximum reward percentage a liquidator can receive
    /// @param _totalBorrowCap max amount that can be borrowed from the contract
    /// @param _collateralizationRate the new collateralization rate value (75000 is 75%)
    /// @param _liquidationCollateralizationRate the new liquidation collateralization rate value (75000 is 75%)
    function setMarketConfig(
        ITapiocaOracle _oracle,
        bytes calldata _oracleData,
        address _conservator,
        uint256 _protocolFee,
        uint256 _liquidationBonusAmount,
        uint256 _minLiquidatorReward,
        uint256 _maxLiquidatorReward,
        uint256 _totalBorrowCap,
        uint256 _collateralizationRate,
        uint256 _liquidationCollateralizationRate
    ) external onlyOwner {
        if (address(_oracle) != address(0)) {
            oracle = _oracle;
            emit OracleUpdated(address(_oracle));
        }
        if (_oracleData.length > 0) {
            oracleData = _oracleData;
            emit OracleDataUpdated();
        }

        if (_conservator != address(0)) {
            emit ConservatorUpdated(conservator, _conservator);
            conservator = _conservator;
        }

        if (_protocolFee > 0) {
            require(_protocolFee <= FEE_PRECISION, "Market: not valid");
            protocolFee = _protocolFee;
            emit ValueUpdated(2, _protocolFee);
        }

        if (_liquidationBonusAmount > 0) {
            require(_liquidationBonusAmount < FEE_PRECISION, "Market: not valid");
            liquidationBonusAmount = _liquidationBonusAmount;
            emit ValueUpdated(3, _liquidationBonusAmount);
        }

        if (_minLiquidatorReward > 0) {
            require(_minLiquidatorReward < FEE_PRECISION, "Market: not valid");
            require(_minLiquidatorReward < maxLiquidatorReward, "Market: not valid");
            minLiquidatorReward = _minLiquidatorReward;
            emit ValueUpdated(4, _minLiquidatorReward);
        }

        if (_maxLiquidatorReward > 0) {
            require(_maxLiquidatorReward < FEE_PRECISION, "Market: not valid");
            require(_maxLiquidatorReward > minLiquidatorReward, "Market: not valid");
            maxLiquidatorReward = _maxLiquidatorReward;
            emit ValueUpdated(5, _maxLiquidatorReward);
        }

        if (_totalBorrowCap > 0) {
            emit LogBorrowCapUpdated(totalBorrowCap, _totalBorrowCap);
            totalBorrowCap = _totalBorrowCap;
            emit ValueUpdated(6, _totalBorrowCap);
        }

        if (_collateralizationRate > 0) {
            require(_collateralizationRate <= FEE_PRECISION, "Market: not valid");
            require(_collateralizationRate <= liquidationCollateralizationRate, "Market: collateralizationRate too big");
            require(
                _collateralizationRate * (FEE_PRECISION + liquidationMultiplier) < FEE_PRECISION * FEE_PRECISION,
                "Market: CR * (1 + LM) >= 1"
            );
            collateralizationRate = _collateralizationRate;
            emit ValueUpdated(7, _collateralizationRate);
        }

        if (_liquidationCollateralizationRate > 0) {
            require(
                _liquidationCollateralizationRate >= collateralizationRate,
                "Market: liquidationCollateralizationRate too small"
            );
            require(_liquidationCollateralizationRate <= FEE_PRECISION, "Market: not valid");
            liquidationCollateralizationRate = _liquidationCollateralizationRate;
            emit ValueUpdated(8, _liquidationCollateralizationRate);
        }
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    function _computeClosingFactor(
        uint256 borrowPart,
        uint256 collateralPartInAsset,
        uint256 ratesPrecision,
        uint256 _liquidationCollateralizationRate,
        uint256 _liquidationMultiplier,
        Rebase memory _totalBorrow
    ) internal pure returns (uint256) {
        // Obviously it's not `borrowPart` anymore but `borrowAmount`
        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        //borrowPart and collateralPartInAsset should already be scaled due to the exchange rate computation
        uint256 liquidationStartsAt =
            (collateralPartInAsset * _liquidationCollateralizationRate) / (10 ** ratesPrecision);

        if (borrowPart < liquidationStartsAt) return 0;

        //compute numerator
        uint256 numerator = borrowPart - liquidationStartsAt;
        //compute denominator
        uint256 diff = (_liquidationCollateralizationRate * ((10 ** ratesPrecision) + _liquidationMultiplier))
            / (10 ** ratesPrecision);
        int256 denominator = (int256(10 ** ratesPrecision) - int256(diff)) * int256(1e13);

        //compute closing factor
        int256 x = (int256(numerator) * int256(1e18)) / denominator;
        int256 xPos = x < 0 ? -x : x;

        //assure closing factor validity
        if (uint256(xPos) > borrowPart) return borrowPart;

        return uint256(xPos);
    }

    /// @notice return the amount of collateral for a `user` to be solvent, min TVL and max TVL. Returns 0 if user already solvent.
    /// @dev we use a `CLOSED_COLLATERIZATION_RATE` that is a safety buffer when making the user solvent again,
    ///      to prevent from being liquidated. This function is valid only if user is not solvent by `_isSolvent()`.
    /// @param user The user to check solvency.
    /// @param _exchangeRate the exchange rate asset/collateral.
    /// @return amountToSolvency the amount of collateral to be solvent.
    /// @return minTVL the asset value of the collateral amount factored by collateralizationRate
    /// @return maxTVL the asset value of the collateral amount.
    function computeTVLInfo(address user, uint256 _exchangeRate)
        public
        view
        returns (uint256 amountToSolvency, uint256 minTVL, uint256 maxTVL)
    {
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return (0, 0, 0);

        Rebase memory _totalBorrow = _accrueView();

        uint256 collateralAmountInAsset = _computeMaxBorrowableAmount(user, _exchangeRate);

        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        unchecked {
            amountToSolvency = borrowPart >= collateralAmountInAsset ? borrowPart - collateralAmountInAsset : 0;
        }
        (minTVL, maxTVL) = _computeMaxAndMinLTVInAsset(userCollateralShare[user], _exchangeRate);
    }

    /// @notice Gets the exchange rate. I.e how much collateral to buy 1e18 asset.
    /// @dev This function is supposed to be invoked if needed because Oracle queries can be expensive.
    ///      Oracle should consider USDO at 1$
    /// @return updated True if `exchangeRate` was updated.
    /// @return rate The new exchange rate.
    function updateExchangeRate() public returns (bool updated, uint256 rate) {
        (updated, rate) = oracle.get(oracleData);
        require(updated, "Market: rate too old");
        require(rate != 0, "Market: invalid rate");

        exchangeRate = rate;
        rateTimestamp = block.timestamp;

        emit LogExchangeRate(rate);
    }

    /// @notice computes the possible liquidator reward
    /// @param user the user for which a liquidation operation should be performed
    /// @param _exchangeRate the exchange rate asset/collateral to use for internal computations
    function computeLiquidatorReward(address user, uint256 _exchangeRate) external view returns (uint256) {
        return _getCallerReward(user, _exchangeRate);
    }

    // ************************** //
    // *** INTERNAL FUNCTIONS *** //
    // ************************** //
    function _accrue() internal virtual;

    function _accrueView() internal view virtual returns (Rebase memory);

    /**
     * @inheritdoc MarketERC20
     */
    function _allowedLend(address from, uint256 share) internal virtual override {
        if (from != msg.sender) {
            if (share == 0) revert AllowanceNotValid();

            uint256 pearlmitAllowed;
            // Here we approve the market token, because it is unique to the market
            if (penrose.cluster().isWhitelisted(0, msg.sender)) {
                (pearlmitAllowed,) = penrose.pearlmit().allowance(from, msg.sender, 20, address(this), 0);
            }
            require(allowance[from][msg.sender] >= share || pearlmitAllowed >= share, "Market: not approved");
            if (pearlmitAllowed >= share) return;
            if (allowance[from][msg.sender] != type(uint256).max) {
                allowance[from][msg.sender] -= share;
            }
        }
    }

    /**
     * @inheritdoc MarketERC20
     */
    function _allowedBorrow(address from, uint256 share) internal virtual override {
        if (from != msg.sender) {
            if (share == 0) revert AllowanceNotValid();

            uint256 pearlmitAllowed;
            // Here we approve the YB collateral token, because market token is already used in `_allowedLend`
            if (penrose.cluster().isWhitelisted(0, msg.sender)) {
                (pearlmitAllowed,) =
                    penrose.pearlmit().allowance(from, msg.sender, 1155, address(yieldBox), collateralId);
            }
            require(allowanceBorrow[from][msg.sender] >= share || pearlmitAllowed >= share, "Market: not approved");
            if (pearlmitAllowed >= share) return;
            if (allowanceBorrow[from][msg.sender] != type(uint256).max) {
                allowanceBorrow[from][msg.sender] -= share;
            }
        }
    }

    function _tryUpdateOracleRate() internal {
        try oracle.get(oracleData) returns (bool _updated, uint256 _exchangeRate) {
            if (_updated && _exchangeRate > 0) {
                exchangeRate = _exchangeRate; //update cached rate
                rateTimestamp = block.timestamp;
            } else {
                _exchangeRate = exchangeRate; //use stored rate
                if (_exchangeRate == 0) revert ExchangeRateNotValid();
            }
        } catch {
            if (exchangeRate == 0) revert ExchangeRateNotValid();
        }
    }

    function _getRevertMsg(bytes memory _returnData) internal pure returns (bytes memory) {
        if (_returnData.length > 1000) return "Market: reason too long";
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "Market: no return data";
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return _returnData; // All that remains is the revert string
    }

    function _computeMaxBorrowableAmount(address user, uint256 _exchangeRate)
        internal
        view
        returns (uint256 collateralAmountInAsset)
    {
        require(_exchangeRate > 0, "Market: exchangeRate not valid");
        uint256 userCollateralAmount = yieldBox.toAmount(collateralId, userCollateralShare[user], false);
        collateralAmountInAsset =
            (userCollateralAmount * (EXCHANGE_RATE_PRECISION / FEE_PRECISION) * collateralizationRate) / _exchangeRate;
    }

    /// @notice Concrete implementation of `isSolvent`. Includes a parameter to allow caching `exchangeRate`.
    /// @param _exchangeRate The exchange rate. Used to cache the `exchangeRate` between calls.
    function _isSolvent(address user, uint256 _exchangeRate, bool _liquidation) internal view returns (bool) {
        // accrue must have already been called!
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return true;
        uint256 collateralShare = userCollateralShare[user];
        if (collateralShare == 0) return false;

        Rebase memory _totalBorrow = totalBorrow;

        uint256 collateralAmount = yieldBox.toAmount(collateralId, collateralShare, false);
        return collateralAmount * (EXCHANGE_RATE_PRECISION / FEE_PRECISION)
            * (_liquidation ? liquidationCollateralizationRate : collateralizationRate)
        // Moved exchangeRate here instead of dividing the other side to preserve more precision
        >= (borrowPart * _totalBorrow.elastic * _exchangeRate) / _totalBorrow.base;
    }

    /// @notice Returns the min and max LTV for user in asset price
    function _computeMaxAndMinLTVInAsset(uint256 collateralShare, uint256 _exchangeRate)
        internal
        view
        returns (uint256 min, uint256 max)
    {
        require(_exchangeRate > 0, "Market: exchangeRate not valid");
        uint256 collateralAmount = yieldBox.toAmount(collateralId, collateralShare, false);

        max = (collateralAmount * EXCHANGE_RATE_PRECISION) / _exchangeRate;
        min = (max * collateralizationRate) / FEE_PRECISION;
    }

    function _getCallerReward(address user, uint256 _exchangeRate) internal view returns (uint256) {
        (uint256 startTVLInAsset, uint256 maxTVLInAsset) =
            _computeMaxAndMinLTVInAsset(userCollateralShare[user], _exchangeRate);

        uint256 borrowed = userBorrowPart[user];
        if (borrowed == 0) return 0;
        if (startTVLInAsset == 0) return 0;

        borrowed = (borrowed * totalBorrow.elastic) / totalBorrow.base;

        if (borrowed < startTVLInAsset) return 0;
        if (borrowed >= maxTVLInAsset) return minLiquidatorReward;

        uint256 rewardPercentage = ((borrowed - startTVLInAsset) * FEE_PRECISION) / (maxTVLInAsset - startTVLInAsset);

        int256 diff = int256(minLiquidatorReward) - int256(maxLiquidatorReward);
        int256 reward = (diff * int256(rewardPercentage)) / int256(FEE_PRECISION) + int256(maxLiquidatorReward);

        if (reward < int256(minLiquidatorReward)) {
            reward = int256(minLiquidatorReward);
        }

        return uint256(reward);
    }

    function _computeAllowanceAmountInAsset(
        address user,
        uint256 _exchangeRate,
        uint256 borrowAmount,
        uint256 assetDecimals
    ) internal view returns (uint256) {
        uint256 maxBorrowable = _computeMaxBorrowableAmount(user, _exchangeRate);

        uint256 shareRatio = _getRatio(borrowAmount, maxBorrowable, assetDecimals);
        return (shareRatio * userCollateralShare[user]) / (10 ** assetDecimals);
    }

    function _getRatio(uint256 numerator, uint256 denominator, uint256 precision) internal pure returns (uint256) {
        if (numerator == 0 || denominator == 0) {
            return 0;
        }
        uint256 _numerator = numerator * 10 ** (precision + 1);
        uint256 _quotient = ((_numerator / denominator) + 5) / 10;
        return (_quotient);
    }
}
