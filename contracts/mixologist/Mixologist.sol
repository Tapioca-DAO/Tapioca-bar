// SPDX-License-Identifier: UNLICENSED

// Copyright (c) 2021 BoringCrypto - All rights reserved
// Twitter: @Boring_Crypto

pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../bar/BeachBar.sol';
import '../swappers/MultiSwapper.sol';
import './interfaces/IOracle.sol';
import './interfaces/IFlashLoan.sol';

// solhint-disable avoid-low-level-calls
// solhint-disable no-inline-assembly

/// @title Mixologist
/// @dev This contract allows contract calls to any contract (except beachBar)
/// from arbitrary callers thus, don't trust calls from this contract in any circumstances.
contract Mixologist is ERC20, BoringOwnable {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    event LogExchangeRate(uint256 rate);
    event LogAccrue(uint256 accruedAmount, uint256 feeFraction, uint64 rate, uint256 utilization);
    event LogAddCollateral(address indexed from, address indexed to, uint256 share);
    event LogAddAsset(address indexed from, address indexed to, uint256 share, uint256 fraction);
    event LogRemoveCollateral(address indexed from, address indexed to, uint256 share);
    event LogRemoveAsset(address indexed from, address indexed to, uint256 share, uint256 fraction);
    event LogBorrow(address indexed from, address indexed to, uint256 amount, uint256 feeAmount, uint256 part);
    event LogRepay(address indexed from, address indexed to, uint256 amount, uint256 part);
    event LogWithdrawFees(address indexed feeTo, uint256 feesEarnedFraction);
    event LogFlashLoan(address indexed borrower, uint256 amount, uint256 feeAmount, address indexed receiver);

    // Constructor settings
    BeachBar public immutable beachBar;
    IERC20 public collateral;
    IERC20 public asset;
    uint256 public collateralId;
    uint256 public assetId;
    IOracle public oracle;
    bytes public oracleData;
    address[] public collateralSwapPath; // Collateral -> Asset
    address[] public tapSwapPath; // Asset -> Tap
    mapping(MultiSwapper => bool) public swappers;

    // Total amounts
    uint256 public totalCollateralShare; // Total collateral supplied
    Rebase public totalAsset; // elastic = beachBar shares held by the Mixologist, base = Total fractions held by asset suppliers
    Rebase public totalBorrow; // elastic = Total token amount to be repayed by borrowers, base = Total parts of the debt held by borrowers

    // User balances
    mapping(address => uint256) public userCollateralShare;
    // userAssetFraction is called balanceOf for ERC20 compatibility (it's in ERC20.sol)
    mapping(address => uint256) public userBorrowPart;

    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    uint256 public exchangeRate;

    struct AccrueInfo {
        uint64 interestPerSecond;
        uint64 lastAccrued;
        uint128 feesEarnedFraction;
    }

    AccrueInfo public accrueInfo;

    // ERC20 'variables'
    function symbol() external view returns (string memory) {
        return string(abi.encodePacked('tm', collateral.safeSymbol(), '/', asset.safeSymbol(), '-', oracle.symbol(oracleData)));
    }

    function name() external view returns (string memory) {
        return string(abi.encodePacked('Tapioca Mixologist ', collateral.safeName(), '/', asset.safeName(), '-', oracle.name(oracleData)));
    }

    function decimals() external view returns (uint8) {
        return asset.safeDecimals();
    }

    // totalSupply for ERC20 compatibility
    function totalSupply() public view override returns (uint256) {
        return totalAsset.base;
    }

    // Settings for the Medium Risk Mixologist
    uint256 private constant CLOSED_COLLATERIZATION_RATE = 75000; // 75%
    uint256 private constant COLLATERIZATION_RATE_PRECISION = 1e5; // Must be less than EXCHANGE_RATE_PRECISION (due to optimization in math)
    uint256 private constant MINIMUM_TARGET_UTILIZATION = 7e17; // 70%
    uint256 private constant MAXIMUM_TARGET_UTILIZATION = 8e17; // 80%
    uint256 private constant UTILIZATION_PRECISION = 1e18;
    uint256 private constant FULL_UTILIZATION = 1e18;
    uint256 private constant FULL_UTILIZATION_MINUS_MAX = FULL_UTILIZATION - MAXIMUM_TARGET_UTILIZATION;
    uint256 private constant FACTOR_PRECISION = 1e18;

    uint64 private constant STARTING_INTEREST_PER_SECOND = 317097920; // approx 1% APR
    uint64 private constant MINIMUM_INTEREST_PER_SECOND = 79274480; // approx 0.25% APR
    uint64 private constant MAXIMUM_INTEREST_PER_SECOND = 317097920000; // approx 1000% APR
    uint256 private constant INTEREST_ELASTICITY = 28800e36; // Half or double in 28800 seconds (8 hours) if linear

    uint256 private constant EXCHANGE_RATE_PRECISION = 1e18;

    uint256 private constant LIQUIDATION_MULTIPLIER = 112000; // add 12%
    uint256 private constant LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

    // Fees
    uint256 private constant PROTOCOL_FEE = 10000; // 10%
    uint256 private constant PROTOCOL_FEE_DIVISOR = 1e5;
    uint256 private constant BORROW_OPENING_FEE = 50; // 0.05%
    uint256 private constant BORROW_OPENING_FEE_PRECISION = 1e5;
    uint256 private constant FLASHLOAN_FEE = 90; // 0.09%
    uint256 private constant FLASHLOAN_FEE_PRECISION = 1e5;

    /// @notice The constructor is only used for the initial master contract. Subsequent clones are initialised via `init`.
    constructor(
        BeachBar tapiocaBar_,
        IERC20 _asset,
        uint256 _assetId,
        IERC20 _collateral,
        uint256 _collateralId,
        IOracle _oracle,
        MultiSwapper _swapper,
        address[] memory _collateralSwapPath,
        address[] memory _tapSwapPath
    ) public {
        beachBar = tapiocaBar_;

        require(
            address(_collateral) != address(0) && address(_asset) != address(0) && address(_oracle) != address(0),
            'Mixologist: bad pair'
        );
        asset = _asset;
        collateral = _collateral;
        assetId = _assetId;
        collateralId = _collateralId;
        oracle = _oracle;
        collateralSwapPath = _collateralSwapPath;
        tapSwapPath = _tapSwapPath;

        swappers[_swapper] = true;
        accrueInfo.interestPerSecond = uint64(STARTING_INTEREST_PER_SECOND); // 1% APR, with 1e18 being 100%

        updateExchangeRate();
    }

    /// @notice Accrues the interest on the borrowed tokens and handles the accumulation of fees.
    function accrue() public {
        AccrueInfo memory _accrueInfo = accrueInfo;
        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - _accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return;
        }
        _accrueInfo.lastAccrued = uint64(block.timestamp);

        Rebase memory _totalBorrow = totalBorrow;
        if (_totalBorrow.base == 0) {
            // If there are no borrows, reset the interest rate
            if (_accrueInfo.interestPerSecond != STARTING_INTEREST_PER_SECOND) {
                _accrueInfo.interestPerSecond = STARTING_INTEREST_PER_SECOND;
                emit LogAccrue(0, 0, STARTING_INTEREST_PER_SECOND, 0);
            }
            accrueInfo = _accrueInfo;
            return;
        }

        uint256 extraAmount = 0;
        uint256 feeFraction = 0;
        Rebase memory _totalAsset = totalAsset;

        // Accrue interest
        extraAmount = (uint256(_totalBorrow.elastic) * _accrueInfo.interestPerSecond * elapsedTime) / 1e18;
        _totalBorrow.elastic += uint128(extraAmount);
        uint256 fullAssetAmount = beachBar.toAmount(assetId, _totalAsset.elastic, false) + _totalBorrow.elastic;

        uint256 feeAmount = (extraAmount * PROTOCOL_FEE) / PROTOCOL_FEE_DIVISOR; // % of interest paid goes to fee
        feeFraction = (feeAmount * _totalAsset.base) / fullAssetAmount;
        _accrueInfo.feesEarnedFraction += uint128(feeFraction);
        totalAsset.base = _totalAsset.base + uint128(feeFraction);
        totalBorrow = _totalBorrow;

        // Update interest rate
        uint256 utilization = (uint256(_totalBorrow.elastic) * UTILIZATION_PRECISION) / fullAssetAmount;
        if (utilization < MINIMUM_TARGET_UTILIZATION) {
            uint256 underFactor = ((MINIMUM_TARGET_UTILIZATION - utilization) * FACTOR_PRECISION) / MINIMUM_TARGET_UTILIZATION;
            uint256 scale = INTEREST_ELASTICITY + (underFactor * underFactor * elapsedTime);
            _accrueInfo.interestPerSecond = uint64((uint256(_accrueInfo.interestPerSecond) * INTEREST_ELASTICITY) / scale);

            if (_accrueInfo.interestPerSecond < MINIMUM_INTEREST_PER_SECOND) {
                _accrueInfo.interestPerSecond = MINIMUM_INTEREST_PER_SECOND; // 0.25% APR minimum
            }
        } else if (utilization > MAXIMUM_TARGET_UTILIZATION) {
            uint256 overFactor = ((utilization - MAXIMUM_TARGET_UTILIZATION) * FACTOR_PRECISION) / FULL_UTILIZATION_MINUS_MAX;
            uint256 scale = INTEREST_ELASTICITY + (overFactor * overFactor * elapsedTime);
            uint256 newInterestPerSecond = (uint256(_accrueInfo.interestPerSecond) * scale) / INTEREST_ELASTICITY;
            if (newInterestPerSecond > MAXIMUM_INTEREST_PER_SECOND) {
                newInterestPerSecond = MAXIMUM_INTEREST_PER_SECOND; // 1000% APR maximum
            }
            _accrueInfo.interestPerSecond = uint64(newInterestPerSecond);
        }

        emit LogAccrue(extraAmount, feeFraction, _accrueInfo.interestPerSecond, utilization);
        accrueInfo = _accrueInfo;
    }

    /// @notice Concrete implementation of `isSolvent`. Includes a third parameter to allow caching `exchangeRate`.
    /// @param _exchangeRate The exchange rate. Used to cache the `exchangeRate` between calls.
    function _isSolvent(address user, uint256 _exchangeRate) internal view returns (bool) {
        // accrue must have already been called!
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return true;
        uint256 collateralShare = userCollateralShare[user];
        if (collateralShare == 0) return false;

        Rebase memory _totalBorrow = totalBorrow;

        return
            beachBar.toAmount(
                collateralId,
                collateralShare * (EXCHANGE_RATE_PRECISION / COLLATERIZATION_RATE_PRECISION) * CLOSED_COLLATERIZATION_RATE,
                false
            ) >=
            // Moved exchangeRate here instead of dividing the other side to preserve more precision
            (borrowPart * _totalBorrow.elastic * _exchangeRate) / _totalBorrow.base;
    }

    /// @dev Checks if the user is solvent in the closed liquidation case at the end of the function body.
    modifier solvent() {
        _;
        require(_isSolvent(msg.sender, exchangeRate), 'Mixologist: user insolvent');
    }

    /// @notice Gets the exchange rate. I.e how much collateral to buy 1e18 asset.
    /// This function is supposed to be invoked if needed because Oracle queries can be expensive.
    /// @return updated True if `exchangeRate` was updated.
    /// @return rate The new exchange rate.
    function updateExchangeRate() public returns (bool updated, uint256 rate) {
        (updated, rate) = oracle.get(oracleData);

        if (updated) {
            exchangeRate = rate;
            emit LogExchangeRate(rate);
        } else {
            // Return the old rate if fetching wasn't successful
            rate = exchangeRate;
        }
    }

    /// @dev Helper function to move tokens.
    /// @param _assetId The ERC-20 token asset ID in beachBar.
    /// @param share The amount in shares to add.
    /// @param total Grand total amount to deduct from this contract's balance. Only applicable if `skim` is True.
    /// Only used for accounting checks.
    /// @param skim If True, only does a balance check on this contract.
    /// False if tokens from msg.sender in `beachBar` should be transferred.
    function _addTokens(
        uint256 _assetId,
        uint256 share,
        uint256 total,
        bool skim
    ) internal {
        if (skim) {
            require(share <= beachBar.balanceOf(address(this), _assetId) - total, 'Mixologist: Skim too much');
        } else {
            beachBar.transfer(msg.sender, address(this), _assetId, share);
        }
    }

    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param to The receiver of the tokens.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `beachBar` should be transferred.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(
        address to,
        bool skim,
        uint256 share
    ) public {
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        _addTokens(collateralId, share, oldTotalCollateralShare, skim);
        emit LogAddCollateral(skim ? address(beachBar) : msg.sender, to, share);
    }

    /// @dev Concrete implementation of `removeCollateral`.
    function _removeCollateral(address to, uint256 share) internal {
        userCollateralShare[msg.sender] -= share;
        totalCollateralShare -= share;
        emit LogRemoveCollateral(msg.sender, to, share);
        beachBar.transfer(address(this), to, collateralId, share);
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(address to, uint256 share) public solvent {
        // accrue must be called because we check solvency
        accrue();
        _removeCollateral(to, share);
    }

    /// @dev Concrete implementation of `addAsset`.
    function _addAsset(
        address to,
        bool skim,
        uint256 share
    ) internal returns (uint256 fraction) {
        Rebase memory _totalAsset = totalAsset;
        uint256 totalAssetShare = _totalAsset.elastic;
        uint256 allShare = _totalAsset.elastic + beachBar.toShare(assetId, totalBorrow.elastic, true);
        fraction = allShare == 0 ? share : (share * _totalAsset.base) / allShare;
        if (_totalAsset.base + uint128(fraction) < 1000) {
            return 0;
        }
        totalAsset = _totalAsset.add(share, fraction);
        balanceOf[to] += fraction;
        emit Transfer(address(0), to, fraction);
        _addTokens(assetId, share, totalAssetShare, skim);
        emit LogAddAsset(skim ? address(beachBar) : msg.sender, to, share, fraction);
    }

    /// @notice Adds assets to the lending pair.
    /// @param to The address of the user to receive the assets.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `beachBar` should be transferred.
    /// @param share The amount of shares to add.
    /// @return fraction Total fractions added.
    function addAsset(
        address to,
        bool skim,
        uint256 share
    ) public returns (uint256 fraction) {
        accrue();
        fraction = _addAsset(to, skim, share);
    }

    /// @dev Concrete implementation of `removeAsset`.
    /// @param from The account to remove from. Should always be msg.sender except for `depositFeesToBeachBar()`.
    function _removeAsset(
        address from,
        address to,
        uint256 fraction
    ) internal returns (uint256 share) {
        Rebase memory _totalAsset = totalAsset;
        uint256 allShare = _totalAsset.elastic + beachBar.toShare(assetId, totalBorrow.elastic, true);
        share = (fraction * allShare) / _totalAsset.base;
        balanceOf[from] -= fraction;
        emit Transfer(msg.sender, address(0), fraction);
        _totalAsset.elastic -= uint128(share);
        _totalAsset.base -= uint128(fraction);
        require(_totalAsset.base >= 1000, 'Mixologist: below minimum');
        totalAsset = _totalAsset;
        emit LogRemoveAsset(msg.sender, to, share, fraction);
        beachBar.transfer(address(this), to, assetId, share);
    }

    /// @notice Removes an asset from msg.sender and transfers it to `to`.
    /// @param to The user that receives the removed assets.
    /// @param fraction The amount/fraction of assets held to remove.
    /// @return share The amount of shares transferred to `to`.
    function removeAsset(address to, uint256 fraction) public returns (uint256 share) {
        accrue();
        share = _removeAsset(msg.sender, to, fraction);
    }

    /// @dev Concrete implementation of `borrow`.
    function _borrow(address to, uint256 amount) internal returns (uint256 part, uint256 share) {
        uint256 feeAmount = (amount * BORROW_OPENING_FEE) / BORROW_OPENING_FEE_PRECISION; // A flat % fee is charged for any borrow

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);
        userBorrowPart[msg.sender] += part;
        emit LogBorrow(msg.sender, to, amount, feeAmount, part);

        share = beachBar.toShare(assetId, amount, false);
        Rebase memory _totalAsset = totalAsset;
        require(_totalAsset.base >= 1000, 'Mixologist: below minimum');
        _totalAsset.elastic -= uint128(share);
        totalAsset = _totalAsset;
        beachBar.transfer(address(this), to, assetId, share);
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(address to, uint256 amount) public solvent returns (uint256 part, uint256 share) {
        accrue();
        (part, share) = _borrow(to, amount);
    }

    /// @dev Concrete implementation of `repay`.
    function _repay(
        address to,
        bool skim,
        uint256 part
    ) internal returns (uint256 amount) {
        (totalBorrow, amount) = totalBorrow.sub(part, true);
        userBorrowPart[to] -= part;

        uint256 share = beachBar.toShare(assetId, amount, true);
        uint128 totalShare = totalAsset.elastic;
        _addTokens(assetId, share, uint256(totalShare), skim);
        totalAsset.elastic = totalShare + uint128(share);
        emit LogRepay(skim ? address(beachBar) : msg.sender, to, amount, part);
    }

    /// @notice Repays a loan.
    /// @param to Address of the user this payment should go.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `beachBar` should be transferred.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        address to,
        bool skim,
        uint256 part
    ) public returns (uint256 amount) {
        accrue();
        amount = _repay(to, skim, part);
    }

    // Functions that need accrue to be called
    uint8 internal constant ACTION_ADD_ASSET = 1;
    uint8 internal constant ACTION_REPAY = 2;
    uint8 internal constant ACTION_REMOVE_ASSET = 3;
    uint8 internal constant ACTION_REMOVE_COLLATERAL = 4;
    uint8 internal constant ACTION_BORROW = 5;
    uint8 internal constant ACTION_GET_REPAY_SHARE = 6;
    uint8 internal constant ACTION_GET_REPAY_PART = 7;
    uint8 internal constant ACTION_ACCRUE = 8;

    // Functions that don't need accrue to be called
    uint8 internal constant ACTION_ADD_COLLATERAL = 10;
    uint8 internal constant ACTION_UPDATE_EXCHANGE_RATE = 11;
    uint8 internal constant ACTION_FLASHLOAN = 12;

    // Function on BeachBar
    uint8 internal constant ACTION_BAR_DEPOSIT = 20;
    uint8 internal constant ACTION_BAR_WITHDRAW = 21;
    uint8 internal constant ACTION_BAR_TRANSFER = 22;
    uint8 internal constant ACTION_BAR_TRANSFER_MULTIPLE = 23;
    uint8 internal constant ACTION_BAR_SETAPPROVAL = 24;

    // Any external call (except to BeachBar)
    uint8 internal constant ACTION_CALL = 30;

    int256 internal constant USE_VALUE1 = -1;
    int256 internal constant USE_VALUE2 = -2;

    /// @dev Helper function for choosing the correct value (`value1` or `value2`) depending on `inNum`.
    function _num(
        int256 inNum,
        uint256 value1,
        uint256 value2
    ) internal pure returns (uint256 outNum) {
        outNum = inNum >= 0 ? uint256(inNum) : (inNum == USE_VALUE1 ? value1 : value2);
    }

    /// @dev Helper function for depositing into `beachBar`.
    function _bentoDeposit(
        bytes memory data,
        uint256 value,
        uint256 value1,
        uint256 value2
    ) internal returns (uint256, uint256) {
        (uint256 _assetId, address to, int256 amount, int256 share) = abi.decode(data, (uint256, address, int256, int256));
        amount = int256(_num(amount, value1, value2)); // Done this way to avoid stack too deep errors
        share = int256(_num(share, value1, value2));
        if (msg.value > 0) {
            return beachBar.depositETH(_assetId, to, value);
        } else {
            return beachBar.deposit(_assetId, msg.sender, to, uint256(amount), uint256(share));
        }
    }

    /// @dev Helper function to withdraw from the `beachBar`.
    function _bentoWithdraw(
        bytes memory data,
        uint256 value1,
        uint256 value2
    ) internal returns (uint256, uint256) {
        (uint256 _assetId, address to, int256 amount, int256 share) = abi.decode(data, (uint256, address, int256, int256));
        return beachBar.withdraw(_assetId, msg.sender, to, _num(amount, value1, value2), _num(share, value1, value2));
    }

    /// @dev Helper function to perform a contract call and eventually extracting revert messages on failure.
    /// Calls to `beachBar` are not allowed for obvious security reasons.
    /// This also means that calls made from this contract shall *not* be trusted.
    function _call(
        uint256 value,
        bytes memory data,
        uint256 value1,
        uint256 value2
    ) internal returns (bytes memory, uint8) {
        (address callee, bytes memory callData, bool useValue1, bool useValue2, uint8 returnValues) = abi.decode(
            data,
            (address, bytes, bool, bool, uint8)
        );

        if (useValue1 && !useValue2) {
            callData = abi.encodePacked(callData, value1);
        } else if (!useValue1 && useValue2) {
            callData = abi.encodePacked(callData, value2);
        } else if (useValue1 && useValue2) {
            callData = abi.encodePacked(callData, value1, value2);
        }

        require(callee != address(beachBar) && callee != address(this), "Mixologist: can't call");

        (bool success, bytes memory returnData) = callee.call{value: value}(callData);
        require(success, 'Mixologist: call failed');
        return (returnData, returnValues);
    }

    struct MixStatus {
        bool needsSolvencyCheck;
        bool hasAccrued;
    }

    /// @notice Executes a set of actions and allows composability (contract calls) to other contracts.
    /// @param actions An array with a sequence of actions to execute (see ACTION_ declarations).
    /// @param values A one-to-one mapped array to `actions`. ETH amounts to send along with the actions.
    /// Only applicable to `ACTION_CALL`, `ACTION_BAR_DEPOSIT`.
    /// @param datas A one-to-one mapped array to `actions`. Contains abi encoded data of function arguments.
    /// @return value1 May contain the first positioned return value of the last executed action (if applicable).
    /// @return value2 May contain the second positioned return value of the last executed action which returns 2 values (if applicable).
    function mix(
        uint8[] calldata actions,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external payable returns (uint256 value1, uint256 value2) {
        MixStatus memory status;
        for (uint256 i = 0; i < actions.length; i++) {
            uint8 action = actions[i];
            if (!status.hasAccrued && action < 10) {
                accrue();
                status.hasAccrued = true;
            }
            if (action == ACTION_ADD_COLLATERAL) {
                (int256 share, address to, bool skim) = abi.decode(datas[i], (int256, address, bool));
                addCollateral(to, skim, _num(share, value1, value2));
            } else if (action == ACTION_ADD_ASSET) {
                (int256 share, address to, bool skim) = abi.decode(datas[i], (int256, address, bool));
                value1 = _addAsset(to, skim, _num(share, value1, value2));
            } else if (action == ACTION_REPAY) {
                (int256 part, address to, bool skim) = abi.decode(datas[i], (int256, address, bool));
                _repay(to, skim, _num(part, value1, value2));
            } else if (action == ACTION_REMOVE_ASSET) {
                (int256 fraction, address to) = abi.decode(datas[i], (int256, address));
                value1 = _removeAsset(msg.sender, to, _num(fraction, value1, value2));
            } else if (action == ACTION_REMOVE_COLLATERAL) {
                (int256 share, address to) = abi.decode(datas[i], (int256, address));
                _removeCollateral(to, _num(share, value1, value2));
                status.needsSolvencyCheck = true;
            } else if (action == ACTION_BORROW) {
                (int256 amount, address to) = abi.decode(datas[i], (int256, address));
                (value1, value2) = _borrow(to, _num(amount, value1, value2));
                status.needsSolvencyCheck = true;
            } else if (action == ACTION_UPDATE_EXCHANGE_RATE) {
                (bool must_update, uint256 minRate, uint256 maxRate) = abi.decode(datas[i], (bool, uint256, uint256));
                (bool updated, uint256 rate) = updateExchangeRate();
                require((!must_update || updated) && rate > minRate && (maxRate == 0 || rate > maxRate), 'Mixologist: rate not ok');
            } else if (action == ACTION_FLASHLOAN) {
                (IFlashBorrower borrower, address receiver, uint256 amount, bytes memory data) = abi.decode(
                    datas[i],
                    (IFlashBorrower, address, uint256, bytes)
                );
                flashLoan(borrower, receiver, amount, data);
            } else if (action == ACTION_BAR_SETAPPROVAL) {
                (address operator, bool approved) = abi.decode(datas[i], (address, bool));
                beachBar.setApprovalForAll(operator, approved);
            } else if (action == ACTION_BAR_DEPOSIT) {
                (value1, value2) = _bentoDeposit(datas[i], values[i], value1, value2);
            } else if (action == ACTION_BAR_WITHDRAW) {
                (value1, value2) = _bentoWithdraw(datas[i], value1, value2);
            } else if (action == ACTION_BAR_TRANSFER) {
                (uint256 _assetId, address to, int256 share) = abi.decode(datas[i], (uint256, address, int256));
                beachBar.transfer(msg.sender, to, _assetId, _num(share, value1, value2));
            } else if (action == ACTION_BAR_TRANSFER_MULTIPLE) {
                (uint256 _assetId, address[] memory tos, uint256[] memory shares) = abi.decode(datas[i], (uint256, address[], uint256[]));
                beachBar.transferMultiple(msg.sender, tos, _assetId, shares);
            } else if (action == ACTION_CALL) {
                (bytes memory returnData, uint8 returnValues) = _call(values[i], datas[i], value1, value2);

                if (returnValues == 1) {
                    (value1) = abi.decode(returnData, (uint256));
                } else if (returnValues == 2) {
                    (value1, value2) = abi.decode(returnData, (uint256, uint256));
                }
            } else if (action == ACTION_GET_REPAY_SHARE) {
                int256 part = abi.decode(datas[i], (int256));
                value1 = beachBar.toShare(assetId, totalBorrow.toElastic(_num(part, value1, value2), true), true);
            } else if (action == ACTION_GET_REPAY_PART) {
                int256 amount = abi.decode(datas[i], (int256));
                value1 = totalBorrow.toBase(_num(amount, value1, value2), false);
            }
        }

        if (status.needsSolvencyCheck) {
            require(_isSolvent(msg.sender, exchangeRate), 'Mixologist: user insolvent');
        }
    }

    /// @notice Handles the liquidation of users' balances, once the users' amount of collateral is too low.
    /// @dev Closed liquidations Only, 90% of extra shares goes to called and 10% to protocol
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        MultiSwapper swapper
    ) public {
        // Oracle can fail but we still need to allow liquidations
        (, uint256 _exchangeRate) = updateExchangeRate();
        accrue();

        uint256 allCollateralShare;
        uint256 allBorrowAmount;
        uint256 allBorrowPart;
        Rebase memory _totalBorrow = totalBorrow;
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!_isSolvent(user, _exchangeRate)) {
                uint256 borrowPart;
                {
                    uint256 availableBorrowPart = userBorrowPart[user];
                    borrowPart = maxBorrowParts[i] > availableBorrowPart ? availableBorrowPart : maxBorrowParts[i];
                    userBorrowPart[user] = availableBorrowPart - borrowPart;
                }
                uint256 borrowAmount = _totalBorrow.toElastic(borrowPart, false);
                uint256 collateralShare = beachBar.toShare(
                    collateralId,
                    (borrowAmount * LIQUIDATION_MULTIPLIER * _exchangeRate) / (LIQUIDATION_MULTIPLIER_PRECISION * EXCHANGE_RATE_PRECISION),
                    false
                );
                userCollateralShare[user] -= collateralShare;
                emit LogRemoveCollateral(user, address(swapper), collateralShare);
                emit LogRepay(address(swapper), user, borrowAmount, borrowPart);

                // Keep totals
                allCollateralShare += collateralShare;
                allBorrowAmount += borrowAmount;
                allBorrowPart += borrowPart;
            }
        }
        require(allBorrowAmount != 0, 'Mixologist: all are solvent');
        _totalBorrow.elastic -= uint128(allBorrowAmount);
        _totalBorrow.base -= uint128(allBorrowPart);
        totalBorrow = _totalBorrow;
        totalCollateralShare -= allCollateralShare;

        uint256 allBorrowShare = beachBar.toShare(assetId, allBorrowAmount, true);

        // Closed liquidation using a pre-approved swapper for the benefit of the LPs
        require(swappers[swapper], 'Mixologist: Invalid swapper');

        // Swaps the users collateral for the borrowed asset
        beachBar.transfer(address(this), address(swapper), collateralId, allCollateralShare);
        swapper.swap(collateralId, assetId, 0, address(this), collateralSwapPath, allCollateralShare);

        uint256 returnedShare = beachBar.balanceOf(address(this), assetId) - uint256(totalAsset.elastic);
        uint256 extraShare = returnedShare - allBorrowShare;
        uint256 feeShare = (extraShare * PROTOCOL_FEE) / PROTOCOL_FEE_DIVISOR; // 10% of profit goes to fee
        uint256 callerShare = extraShare - feeShare;

        beachBar.transfer(address(this), beachBar.feeTo(), assetId, feeShare);
        beachBar.transfer(address(this), msg.sender, assetId, callerShare);

        totalAsset.elastic += uint128(returnedShare - feeShare - callerShare);
        emit LogAddAsset(address(swapper), address(this), extraShare - feeShare - callerShare, 0);
    }

    /// @notice Flashloan ability.
    //  @dev The contract expect the `borrower` to have at the end of `onFlashLoan` `amount` + the incurred fees
    /// @param borrower The address of the contract that implements and conforms to `IFlashBorrower` and handles the flashloan.
    /// @param receiver Address of the token receiver.
    /// @param amount of the tokens to receive.
    /// @param data The calldata to pass to the `borrower` contract.
    function flashLoan(
        IFlashBorrower borrower,
        address receiver,
        uint256 amount,
        bytes memory data
    ) public {
        Rebase memory _totalAsset = totalAsset;
        uint256 feeAmount = (amount * FLASHLOAN_FEE) / FLASHLOAN_FEE_PRECISION;
        uint256 feeFraction = (feeAmount * _totalAsset.base) / _totalAsset.elastic;
        totalAsset.base = _totalAsset.base + uint128(feeFraction);
        accrueInfo.feesEarnedFraction += uint128(feeFraction);

        beachBar.withdraw(assetId, address(this), receiver, amount, 0);

        borrower.onFlashLoan(msg.sender, asset, amount, feeAmount, data);

        beachBar.deposit(assetId, address(borrower), address(this), amount + feeAmount, 0);

        emit LogFlashLoan(address(borrower), amount, feeAmount, receiver);
    }

    /// @notice Withdraw the fees accumulated in `accrueInfo.feesEarnedFraction` to the balance of `feeTo`.
    function withdrawFeesEarned() public {
        accrue();
        address _feeTo = beachBar.feeTo();
        uint256 _feesEarnedFraction = accrueInfo.feesEarnedFraction;
        balanceOf[_feeTo] += _feesEarnedFraction;
        emit Transfer(address(0), _feeTo, _feesEarnedFraction);
        accrueInfo.feesEarnedFraction = 0;
        emit LogWithdrawFees(_feeTo, _feesEarnedFraction);
    }

    /// @notice Withdraw the balance of `feeTo`, swap it and deposit it to BeachBar of `feeTo`
    function depositFeesToBeachBar(MultiSwapper swapper) public {
        if (accrueInfo.feesEarnedFraction > 0) {
            withdrawFeesEarned();
        }
        require(swappers[swapper], 'Mixologist: Invalid swapper');
        address _feeTo = beachBar.feeTo();

        uint256 feeShares = _removeAsset(_feeTo, address(this), balanceOf[_feeTo]);
        swapper.swap(assetId, beachBar.tapAssetId(), 0, _feeTo, collateralSwapPath, feeShares);
    }

    /// @notice Used to register and enable or disable swapper contracts used in closed liquidations.
    /// MasterContract Only Admin function.
    /// @param swapper The address of the swapper contract that conforms to `ISwapper`.
    /// @param enable True to enable the swapper. To disable use False.
    function setSwapper(MultiSwapper swapper, bool enable) public onlyOwner {
        swappers[swapper] = enable;
    }

    /// @notice Used to set the swap path of closed liquidations
    /// @param _collateralSwapPath The Uniswap path .
    function setCollateralSwapPath(address[] calldata _collateralSwapPath) public onlyOwner {
        collateralSwapPath = _collateralSwapPath;
    }

    /// @notice Used to set the swap path of Asset -> TAP
    /// @param _tapSwapPath The Uniswap path .
    function setTapSwapPath(address[] calldata _tapSwapPath) public onlyOwner {
        tapSwapPath = _tapSwapPath;
    }
}
