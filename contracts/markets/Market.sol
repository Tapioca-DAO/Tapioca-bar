// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";
import "tapioca-periph/contracts/interfaces/IOracle.sol";
import "tapioca-periph/contracts/interfaces/IPenrose.sol";
import "./MarketERC20.sol";

abstract contract Market is MarketERC20, BoringOwnable {
    using RebaseLibrary for Rebase;

    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice returns YieldBox address
    YieldBox public yieldBox;
    /// @notice returns Penrose address
    IPenrose public penrose;

    /// @notice collateral token address
    IERC20 public collateral;
    /// @notice collateral token YieldBox id
    uint256 public collateralId;
    /// @notice asset token address
    IERC20 public asset;
    /// @notice asset token YieldBox id
    uint256 public assetId;

    /// @notice contract's pause state
    bool public paused;
    /// @notice conservator's addresss
    /// @dev conservator can pause/unpause the contract
    address public conservator;

    /// @notice oracle address
    IOracle public oracle;
    /// @notice oracleData
    bytes public oracleData;
    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    /// Asset -> collateral = assetAmount * exchangeRate.
    uint256 public exchangeRate;

    /// @notice total amount borrowed
    /// @dev elastic = Total token amount to be repayed by borrowers, base = Total parts of the debt held by borrowers
    Rebase public totalBorrow;
    /// @notice total collateral supplied
    uint256 public totalCollateralShare;
    /// @notice max borrow cap
    uint256 public totalBorrowCap;
    /// @notice borrow amount per user
    mapping(address => uint256) public userBorrowPart;
    /// @notice collateral share per user
    mapping(address => uint256) public userCollateralShare;

    /// @notice liquidation caller rewards
    uint256 public callerFee; // 90%
    /// @notice liquidation protocol rewards
    uint256 public protocolFee; // 10%
    /// @notice min % a liquidator can receive in rewards
    uint256 public minLiquidatorReward = 1e3; //1%
    /// @notice max % a liquidator can receive in rewards
    uint256 public maxLiquidatorReward = 1e4; //10%
    /// @notice max liquidatable bonus amount
    /// @dev max % added to the amount that can be liquidated
    uint256 public liquidationBonusAmount = 1e4; //10%
    /// @notice collateralization rate
    uint256 public collateralizationRate; // 75%
    /// @notice borrowing opening fee
    uint256 public borrowOpeningFee = 50; //0.05%
    /// @notice liquidation multiplier used to compute liquidator rewards
    uint256 public liquidationMultiplier = 12000; //12%

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal EXCHANGE_RATE_PRECISION; //not costant, but can only be set in the 'init' method
    uint256 internal constant FEE_PRECISION = 1e5;
    uint256 internal constant FEE_PRECISION_DECIMALS = 5;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when conservator is updated
    event ConservatorUpdated(address indexed old, address indexed _new);
    /// @notice event emitted when pause state is changed
    event PausedUpdated(bool oldState, bool newState);
    /// @notice event emitted when cached exchange rate is updated
    event LogExchangeRate(uint256 rate);
    /// @notice event emitted when borrow cap is updated
    event LogBorrowCapUpdated(uint256 _oldVal, uint256 _newVal);
    /// @notice event emitted when oracle data is updated
    event OracleDataUpdated();
    /// @notice event emitted when oracle is updated
    event OracleUpdated();
    /// @notice event emitted when a position is liquidated
    event Liquidated(
        address indexed liquidator,
        address[] users,
        uint256 liquidatorReward,
        uint256 protocolReward,
        uint256 repayedAmount,
        uint256 collateralShareRemoved
    );
    /// @notice event emitted when borrow opening fee is updated
    event LogBorrowingFee(uint256 _oldVal, uint256 _newVal);
    /// @notice event emitted when the liquidation multiplier rate is updated
    event LiquidationMultiplierUpdated(uint256 oldVal, uint256 newVal);

    modifier notSelf(address destination) {
        require(
            destination != address(this),
            "Market: cannot execute on itself"
        );
        _;
    }
    modifier notPaused() {
        require(!paused, "Market: paused");
        _;
    }
    /// @dev Checks if the user is solvent in the closed liquidation case at the end of the function body.
    modifier solvent(address from) {
        updateExchangeRate();
        _accrue();

        _;

        require(_isSolvent(from, exchangeRate), "Market: insolvent");
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
    /// @notice sets the borrowing opening fee
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setBorrowOpeningFee(uint256 _val) external onlyOwner {
        require(_val <= FEE_PRECISION, "Market: not valid");
        emit LogBorrowingFee(borrowOpeningFee, _val);
        borrowOpeningFee = _val;
    }

    /// @notice sets max borrowable amount
    /// @dev can only be called by the owner
    /// @param _cap the new value
    function setBorrowCap(uint256 _cap) external notPaused onlyOwner {
        emit LogBorrowCapUpdated(totalBorrowCap, _cap);
        totalBorrowCap = _cap;
    }

    /// @notice sets common market configuration
    /// @dev values are updated only if > 0 or not address(0)
    function setMarketConfig(
        uint256 _borrowOpeningFee,
        IOracle _oracle,
        bytes calldata _oracleData,
        address _conservator,
        uint256 _callerFee,
        uint256 _protocolFee,
        uint256 _liquidationBonusAmount,
        uint256 _minLiquidatorReward,
        uint256 _maxLiquidatorReward,
        uint256 _totalBorrowCap,
        uint256 _collateralizationRate
    ) external onlyOwner {
        if (_borrowOpeningFee > 0) {
            require(_borrowOpeningFee <= FEE_PRECISION, "Market: not valid");
            emit LogBorrowingFee(borrowOpeningFee, _borrowOpeningFee);
            borrowOpeningFee = _borrowOpeningFee;
        }

        if (address(_oracle) != address(0)) {
            oracle = _oracle;
            emit OracleUpdated();
        }

        if (_oracleData.length > 0) {
            oracleData = _oracleData;
            emit OracleDataUpdated();
        }

        if (_conservator != address(0)) {
            emit ConservatorUpdated(conservator, _conservator);
            conservator = _conservator;
        }

        if (_callerFee > 0) {
            require(_callerFee <= FEE_PRECISION, "Market: not valid");
            callerFee = _callerFee;
        }

        if (_protocolFee > 0) {
            require(_protocolFee <= FEE_PRECISION, "Market: not valid");
            protocolFee = _protocolFee;
        }

        if (_liquidationBonusAmount > 0) {
            require(
                _liquidationBonusAmount < FEE_PRECISION,
                "Market: not valid"
            );
            liquidationBonusAmount = _liquidationBonusAmount;
        }

        if (_minLiquidatorReward > 0) {
            require(_minLiquidatorReward < FEE_PRECISION, "Market: not valid");
            require(
                _minLiquidatorReward < maxLiquidatorReward,
                "Market: not valid"
            );
            minLiquidatorReward = _minLiquidatorReward;
        }

        if (_maxLiquidatorReward > 0) {
            require(_maxLiquidatorReward < FEE_PRECISION, "Market: not valid");
            require(
                _maxLiquidatorReward > minLiquidatorReward,
                "Market: not valid"
            );
            maxLiquidatorReward = _maxLiquidatorReward;
        }

        if (_totalBorrowCap > 0) {
            emit LogBorrowCapUpdated(totalBorrowCap, _totalBorrowCap);
            totalBorrowCap = _totalBorrowCap;
        }

        if (_collateralizationRate > 0) {
            require(
                _collateralizationRate <= FEE_PRECISION,
                "Market: not valid"
            );
            collateralizationRate = _collateralizationRate;
        }
    }

    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(bool val) external {
        require(msg.sender == conservator, "Market: unauthorized");
        require(val != paused, "Market: same state");
        emit PausedUpdated(paused, val);
        paused = val;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns the maximum liquidatable amount for user
    function computeClosingFactor(
        uint256 borrowPart,
        uint256 collateralPartInAsset,
        uint256 ratesPrecision
    ) public view returns (uint256) {
        //borrowPart and collateralPartInAsset should already be scaled due to the exchange rate computation
        uint256 liquidationStartsAt = (collateralPartInAsset *
            collateralizationRate) / (10 ** ratesPrecision);

        if (borrowPart < liquidationStartsAt) return 0;

        uint256 numerator = borrowPart - liquidationStartsAt;
        uint256 denominator = ((10 ** ratesPrecision) -
            (collateralizationRate *
                ((10 ** ratesPrecision) + liquidationMultiplier)) /
            (10 ** ratesPrecision)) * (10 ** (18 - ratesPrecision));

        uint256 x = (numerator * 1e18) / denominator;
        return x;
    }

    /// @notice return the amount of collateral for a `user` to be solvent, min TVL and max TVL. Returns 0 if user already solvent.
    /// @dev we use a `CLOSED_COLLATERIZATION_RATE` that is a safety buffer when making the user solvent again,
    ///      to prevent from being liquidated. This function is valid only if user is not solvent by `_isSolvent()`.
    /// @param user The user to check solvency.
    /// @param _exchangeRate the exchange rate asset/collateral.
    /// @return amountToSolvency the amount of collateral to be solvent.
    function computeTVLInfo(
        address user,
        uint256 _exchangeRate
    )
        public
        view
        returns (uint256 amountToSolvency, uint256 minTVL, uint256 maxTVL)
    {
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return (0, 0, 0);

        Rebase memory _totalBorrow = totalBorrow;

        uint256 collateralAmountInAsset = _computeMaxBorrowableAmount(
            user,
            _exchangeRate
        );

        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        amountToSolvency = borrowPart >= collateralAmountInAsset
            ? borrowPart - collateralAmountInAsset
            : 0;

        (minTVL, maxTVL) = _computeMaxAndMinLTVInAsset(
            userCollateralShare[user],
            _exchangeRate
        );
    }

    /// @notice Gets the exchange rate. I.e how much collateral to buy 1e18 asset.
    /// @dev This function is supposed to be invoked if needed because Oracle queries can be expensive.
    ///      Oracle should consider USDO at 1$
    /// @return updated True if `exchangeRate` was updated.
    /// @return rate The new exchange rate.
    function updateExchangeRate() public returns (bool updated, uint256 rate) {
        (updated, rate) = oracle.get("");

        if (updated) {
            require(rate > 0, "Market: invalid rate");
            exchangeRate = rate;
            emit LogExchangeRate(rate);
        } else {
            // Return the old rate if fetching wasn't successful
            rate = exchangeRate;
        }
    }

    /// @notice computes the possible liquidator reward
    /// @notice user the user for which a liquidation operation should be performed
    /// @param _exchangeRate the exchange rate asset/collateral to use for internal computations
    function computeLiquidatorReward(
        address user,
        uint256 _exchangeRate
    ) public view returns (uint256) {
        return _getCallerReward(user, _exchangeRate);
    }

    // ************************** //
    // *** INTERNAL FUNCTIONS *** //
    // ************************** //
    function _accrue() internal virtual;

    function _getRevertMsg(
        bytes memory _returnData
    ) internal pure returns (string memory) {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "Market: no return data";
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }

    function _computeMaxBorrowableAmount(
        address user,
        uint256 _exchangeRate
    ) internal view returns (uint256 collateralAmountInAsset) {
        require(_exchangeRate > 0, "Market: exchangeRate not valid");
        collateralAmountInAsset =
            yieldBox.toAmount(
                collateralId,
                (userCollateralShare[user] *
                    (EXCHANGE_RATE_PRECISION / FEE_PRECISION) *
                    collateralizationRate),
                false
            ) /
            _exchangeRate;
    }

    /// @notice Concrete implementation of `isSolvent`. Includes a parameter to allow caching `exchangeRate`.
    /// @param _exchangeRate The exchange rate. Used to cache the `exchangeRate` between calls.
    function _isSolvent(
        address user,
        uint256 _exchangeRate
    ) internal view returns (bool) {
        // accrue must have already been called!
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return true;
        uint256 collateralShare = userCollateralShare[user];
        if (collateralShare == 0) return false;

        Rebase memory _totalBorrow = totalBorrow;

        return
            yieldBox.toAmount(
                collateralId,
                collateralShare *
                    (EXCHANGE_RATE_PRECISION / FEE_PRECISION) *
                    collateralizationRate,
                false
            ) >=
            // Moved exchangeRate here instead of dividing the other side to preserve more precision
            (borrowPart * _totalBorrow.elastic * _exchangeRate) /
                _totalBorrow.base;
    }

    /// @notice Returns the min and max LTV for user in asset price
    function _computeMaxAndMinLTVInAsset(
        uint256 collateralShare,
        uint256 _exchangeRate
    ) internal view returns (uint256 min, uint256 max) {
        require(_exchangeRate > 0, "Market: exchangeRate not valid");
        uint256 collateralAmount = yieldBox.toAmount(
            collateralId,
            collateralShare,
            false
        );

        max = (collateralAmount * EXCHANGE_RATE_PRECISION) / _exchangeRate;
        min = (max * collateralizationRate) / FEE_PRECISION;
    }

    function _getCallerReward(
        address user,
        uint256 _exchangeRate
    ) internal view returns (uint256) {
        (
            uint256 startTVLInAsset,
            uint256 maxTVLInAsset
        ) = _computeMaxAndMinLTVInAsset(
                userCollateralShare[user],
                _exchangeRate
            );

        uint256 borrowed = userBorrowPart[user];
        if (borrowed == 0) return 0;
        if (startTVLInAsset == 0) return 0;

        if (borrowed < startTVLInAsset) return 0;
        if (borrowed >= maxTVLInAsset) return minLiquidatorReward;

        uint256 rewardPercentage = ((borrowed - startTVLInAsset) *
            FEE_PRECISION) / (maxTVLInAsset - startTVLInAsset);

        int256 diff = int256(minLiquidatorReward) - int256(maxLiquidatorReward);
        int256 reward = (diff * int256(rewardPercentage)) /
            int256(FEE_PRECISION) +
            int256(maxLiquidatorReward);

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
        uint256 maxBorrowabe = _computeMaxBorrowableAmount(user, _exchangeRate);

        uint256 shareRatio = _getRatio(
            borrowAmount,
            maxBorrowabe,
            assetDecimals
        );
        return (shareRatio * userCollateralShare[user]) / (10 ** assetDecimals);
    }

    function _getRatio(
        uint256 numerator,
        uint256 denominator,
        uint256 precision
    ) internal pure returns (uint256) {
        if (numerator == 0 || denominator == 0) {
            return 0;
        }
        uint256 _numerator = numerator * 10 ** (precision + 1);
        uint256 _quotient = ((_numerator / denominator) + 5) / 10;
        return (_quotient);
    }
}
