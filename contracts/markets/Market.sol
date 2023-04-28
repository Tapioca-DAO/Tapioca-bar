// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";
import "tapioca-periph/contracts/interfaces/IOracle.sol";

import "../interfaces/IPenrose.sol";

abstract contract Market is BoringOwnable {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    YieldBox public yieldBox;
    IPenrose public penrose;

    IERC20 public collateral;
    uint256 public collateralId;
    IERC20 public asset;
    uint256 public assetId;

    bool public paused;
    address public conservator;

    IOracle public oracle;
    bytes public oracleData;
    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    /// Asset -> collateral = assetAmount * exchangeRate.
    uint256 public exchangeRate;

    Rebase public totalBorrow; // elastic = Total token amount to be repayed by borrowers, base = Total parts of the debt held by borrowers
    uint256 public totalCollateralShare; // Total collateral supplied
    uint256 public totalBorrowCap;
    mapping(address => uint256) public userBorrowPart;
    mapping(address => uint256) public userCollateralShare;

    uint256 public callerFee; // 90%
    uint256 public protocolFee; // 10%
    uint256 public minLiquidatorReward = 1e3; //1%
    uint256 public maxLiquidatorReward = 1e4; //10%
    uint256 public liquidationBonusAmount = 1e4; //10%
    uint256 public collateralizationRate; // 75%

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal EXCHANGE_RATE_PRECISION; //not costant, but can only be set in the 'init' method
    uint256 internal constant COLLATERALIZATION_RATE_PRECISION = 1e5; // Must be less than EXCHANGE_RATE_PRECISION (due to optimization in math)
    uint256 internal constant FEE_PRECISION = 1e5;
    uint256 internal constant LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error NotApproved(address _from, address _operator);

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event ConservatorUpdated(address indexed old, address indexed _new);
    event PausedUpdated(bool oldState, bool newState);
    event LogExchangeRate(uint256 rate);
    event LogBorrowCapUpdated(uint256 _oldVal, uint256 _newVal);

    modifier notPaused() {
        require(!paused, "Market: paused");
        _;
    }
    /// @dev Checks if the user is solvent in the closed liquidation case at the end of the function body.
    modifier solvent(address from) {
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
    /// @notice Set the Conservator address
    /// @dev Conservator can pause the contract
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
    /// @param val the new value
    function updatePause(bool val) external {
        require(msg.sender == conservator, "Market: unauthorized");
        require(val != paused, "Market: same state");
        emit PausedUpdated(paused, val);
        paused = val;
    }

    /// @notice Set the bonus amount a liquidator can make use of, on top of the amount needed to make the user solvent
    /// @param _val the new value
    function setLiquidationBonusAmount(uint256 _val) external onlyOwner {
        require(_val < FEE_PRECISION, "Market: not valid");
        liquidationBonusAmount = _val;
    }

    /// @notice Set the liquidator min reward
    /// @param _val the new value
    function setMinLiquidatorReward(uint256 _val) external onlyOwner {
        require(_val < FEE_PRECISION, "Market: not valid");
        require(_val < maxLiquidatorReward, "Market: not valid");
        minLiquidatorReward = _val;
    }

    /// @notice Set the liquidator max reward
    /// @param _val the new value
    function setMaxLiquidatorReward(uint256 _val) external onlyOwner {
        require(_val < FEE_PRECISION, "Market: not valid");
        require(_val > minLiquidatorReward, "Market: not valid");
        maxLiquidatorReward = _val;
    }

    /// @notice sets max borrowable amount
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
    /// @notice Return the maximum liquidatable amount for user
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

    /// @notice Return the amount of collateral for a `user` to be solvent, min TVL and max TVL. Returns 0 if user already solvent.
    /// @dev We use a `CLOSED_COLLATERIZATION_RATE` that is a safety buffer when making the user solvent again,
    ///      To prevent from being liquidated. This function is valid only if user is not solvent by `_isSolvent()`.
    /// @param user The user to check solvency.
    /// @param _exchangeRate The exchange rate asset/collateral.
    /// @return amountToSolvency The amount of collateral to be solvent.
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
        uint256 collateralShare = userCollateralShare[user];

        Rebase memory _totalBorrow = totalBorrow;

        uint256 collateralAmountInAsset = yieldBox.toAmount(
            collateralId,
            (collateralShare *
                (EXCHANGE_RATE_PRECISION / COLLATERALIZATION_RATE_PRECISION) *
                collateralizationRate),
            false
        ) / _exchangeRate;
        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        amountToSolvency = borrowPart >= collateralAmountInAsset
            ? borrowPart - collateralAmountInAsset
            : 0;

        (minTVL, maxTVL) = _computeMaxAndMinLTVInAsset(
            collateralShare,
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
            exchangeRate = rate;
            emit LogExchangeRate(rate);
        } else {
            // Return the old rate if fetching wasn't successful
            rate = exchangeRate;
        }
    }

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
}
