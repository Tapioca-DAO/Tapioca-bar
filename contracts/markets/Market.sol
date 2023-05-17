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

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal EXCHANGE_RATE_PRECISION; //not costant, but can only be set in the 'init' method
    uint256 internal constant COLLATERALIZATION_RATE_PRECISION = 1e5; // Must be less than EXCHANGE_RATE_PRECISION (due to optimization in math)
    uint256 internal constant FEE_PRECISION = 1e5;
    uint256 internal constant LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

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
    /// @notice updates oracle data
    /// @dev can only be called by the owner
    /// @param _oracleData new oracle data
    function setOracleData(bytes calldata _oracleData) external onlyOwner {
        oracleData = _oracleData;
        emit OracleDataUpdated();
    }

    /// @notice Set the Conservator address
    /// @dev conservator can pause the contract
    ///      can only be called by the owner
    /// @param _conservator The new address
    function setConservator(address _conservator) external onlyOwner {
        require(_conservator != address(0), "Market: address not valid");
        emit ConservatorUpdated(conservator, _conservator);
        conservator = _conservator;
    }

    /// @notice sets the liquidator fee
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setCallerFee(uint256 _val) external onlyOwner {
        require(_val <= FEE_PRECISION, "Market: not valid");
        callerFee = _val;
    }

    /// @notice sets the protocol fee
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setProtocolFee(uint256 _val) external onlyOwner {
        require(_val <= FEE_PRECISION, "Market: not valid");
        protocolFee = _val;
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

    /// @notice Set the bonus amount a liquidator can make use of, on top of the amount needed to make the user solvent
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setLiquidationBonusAmount(uint256 _val) external onlyOwner {
        require(_val < FEE_PRECISION, "Market: not valid");
        liquidationBonusAmount = _val;
    }

    /// @notice Set the liquidator min reward
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setMinLiquidatorReward(uint256 _val) external onlyOwner {
        require(_val < FEE_PRECISION, "Market: not valid");
        require(_val < maxLiquidatorReward, "Market: not valid");
        minLiquidatorReward = _val;
    }

    /// @notice Set the liquidator max reward
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setMaxLiquidatorReward(uint256 _val) external onlyOwner {
        require(_val < FEE_PRECISION, "Market: not valid");
        require(_val > minLiquidatorReward, "Market: not valid");
        maxLiquidatorReward = _val;
    }

    /// @notice sets max borrowable amount
    /// @dev can only be called by the owner
    /// @param _cap the new value
    function setBorrowCap(uint256 _cap) external notPaused onlyOwner {
        emit LogBorrowCapUpdated(totalBorrowCap, _cap);
        totalBorrowCap = _cap;
    }

    /// @notice sets the collateralization rate
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setCollateralizationRate(uint256 _val) external onlyOwner {
        require(_val <= COLLATERALIZATION_RATE_PRECISION, "Market: not valid");
        collateralizationRate = _val;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns the maximum liquidatable amount for user
    /// @param user the user address
    /// @param _exchangeRate the exchange rate asset/collateral to use for internal computations
    function computeClosingFactor(
        address user,
        uint256 _exchangeRate
    ) public view returns (uint256) {
        if (_isSolvent(user, _exchangeRate)) return 0;

        (uint256 amountToSolvency, , uint256 maxTVL) = computeTVLInfo(
            user,
            _exchangeRate
        );
        uint256 borrowed = userBorrowPart[user];
        if (borrowed >= maxTVL) return borrowed;

        return
            amountToSolvency +
            ((liquidationBonusAmount * borrowed) / FEE_PRECISION);
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
        (uint256 minTVL, uint256 maxTVL) = _computeMaxAndMinLTVInAsset(
            userCollateralShare[user],
            _exchangeRate
        );
        return _getCallerReward(userBorrowPart[user], minTVL, maxTVL);
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
        collateralAmountInAsset =
            yieldBox.toAmount(
                collateralId,
                (userCollateralShare[user] *
                    (EXCHANGE_RATE_PRECISION /
                        COLLATERALIZATION_RATE_PRECISION) *
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
                    (EXCHANGE_RATE_PRECISION /
                        COLLATERALIZATION_RATE_PRECISION) *
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
        uint256 collateralAmount = yieldBox.toAmount(
            collateralId,
            collateralShare,
            false
        );

        max = (collateralAmount * EXCHANGE_RATE_PRECISION) / _exchangeRate;
        min = (max * collateralizationRate) / COLLATERALIZATION_RATE_PRECISION;
    }

    function _getCallerReward(
        uint256 borrowed,
        uint256 startTVLInAsset,
        uint256 maxTVLInAsset
    ) internal view returns (uint256) {
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
    ) private pure returns (uint256) {
        if (numerator == 0 || denominator == 0) {
            return 0;
        }
        uint256 _numerator = numerator * 10 ** (precision + 1);
        uint256 _quotient = ((_numerator / denominator) + 5) / 10;
        return (_quotient);
    }
}
