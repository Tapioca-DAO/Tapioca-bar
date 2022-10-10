// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../../yieldbox/contracts/YieldBox.sol';
import '../mixologist/interfaces/IOracle.sol';
import '../BeachBar.sol';

// solhint-disable max-line-length

contract MinterMixologist is BoringOwnable {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    struct AccrueInfo {
        uint64 stabilityFee;
        uint64 lastAccrued;
        uint128 feesEarned;
    }
    AccrueInfo public accrueInfo;

    BeachBar public beachBar;
    YieldBox public yieldBox;
    IERC20 public collateral;
    IUSD0 public asset;
    uint256 public collateralId;
    uint256 public assetId;

    // Total amounts
    uint256 public totalCollateralShare; // Total collateral supplied
    Rebase public totalBorrow; // elastic = Total token amount to be repayed by borrowers, base = Total parts of the debt held by borrowers
    uint256 public totalBorrowCap;
    mapping(address => uint256) public balanceOf;

    // User balances
    mapping(address => uint256) public userCollateralShare;
    // userAssetFraction is called balanceOf for ERC20 compatibility (it's in ERC20.sol)

    mapping(address => uint256) private userOpeningFeesAmount;
    mapping(address => uint256) public userBorrowPart;

    // map of operator approval
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    /// Asset -> collateral = assetAmount * exchangeRate.
    uint256 public exchangeRate;
    uint256 public borrowingFee;

    IOracle oracle;
    address[] tapSwapPath; // Asset -> Tap
    address[] collateralSwapPath; // Collateral -> Asset

    //errors
    error NotApproved(address _from, address _operator);

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event LogExchangeRate(uint256 rate);
    event LogAccrue(uint256 accruedAmount, uint256 feeFraction, uint64 rate);
    event LogAddCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    event LogRemoveCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    event LogBorrow(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 feeAmount,
        uint256 part
    );
    event LogRepay(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 part
    );
    event LogWithdrawFees(address indexed feeTo, uint256 feesEarned);
    event LogYieldBoxFeesDeposit(uint256 feeShares, uint256 tapAmount);
    event LogApprovalForAll(
        address indexed _from,
        address indexed _operator,
        bool _approved
    );
    event LogBorrowCapUpdated(uint256 _oldVal, uint256 _newVal);
    event LogStabilityFee(uint256 _oldFee, uint256 _newFee);
    event LogBorrowingFee(uint256 _oldVal, uint256 _newVal);
    event LogCollateralSwapPath();
    event LogTapSwapPath();

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 internal constant CLOSED_COLLATERIZATION_RATE = 75000; // 75%
    uint256 private constant COLLATERIZATION_RATE_PRECISION = 1e5; // Must be less than EXCHANGE_RATE_PRECISION (due to optimization in math)
    uint256 private constant EXCHANGE_RATE_PRECISION = 1e18;
    uint64 private constant STABILITY_FEE = 317097920; // approx 1% APR

    uint256 internal constant LIQUIDATION_MULTIPLIER = 112000; // add 12%
    uint256 internal constant LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

    // Fees
    uint256 internal constant CALLER_FEE = 1000; // 1%
    uint256 internal constant CALLER_FEE_DIVISOR = 1e5;
    uint256 private constant PROTOCOL_FEE = 10000; // 10%
    uint256 private constant PROTOCOL_FEE_DIVISOR = 1e5;
    uint256 private constant DEFAULT_BORROW_OPENING_FEE = 0; // 50=0.05%
    uint256 private constant BORROW_OPENING_FEE_PRECISION = 1e5;

    // ************* //
    // *** METHODS *** //
    // ************* //

    /// @notice Creates the MinterMixologist contract
    constructor(
        BeachBar tapiocaBar_,
        IERC20 _collateral,
        uint256 _collateralId,
        IOracle _oracle,
        address[] memory _tapSwapPath,
        address[] memory _collateralSwapPath
    ) {
        beachBar = tapiocaBar_;
        yieldBox = tapiocaBar_.yieldBox();
        owner = address(beachBar);

        tapSwapPath = _tapSwapPath;
        collateralSwapPath = _collateralSwapPath;

        address _asset = address(beachBar.usdoToken());

        require(
            address(_collateral) != address(0) &&
                address(_asset) != address(0) &&
                address(_oracle) != address(0),
            'Mx: bad pair'
        );

        asset = IUSD0(_asset);
        assetId = beachBar.usdoAssetId();
        collateral = _collateral;
        collateralId = _collateralId;
        oracle = _oracle;

        accrueInfo.stabilityFee = uint64(STABILITY_FEE); // 1% APR, with 1e18 being 100%
        borrowingFee = DEFAULT_BORROW_OPENING_FEE;

        updateExchangeRate();

        owner = msg.sender;
    }

    // --- Modifiers ---
    /// Modifier to check if the msg.sender is allowed to use funds belonging to the 'from' address.
    /// If 'from' is msg.sender, it's allowed.
    /// If 'msg.sender' is an address (an operator) that is approved by 'from', it's allowed.
    modifier allowed(address from) virtual {
        if (from != msg.sender && !isApprovedForAll[from][msg.sender]) {
            revert NotApproved(from, msg.sender);
        }
        _;
    }
    /// @dev Checks if the user is solvent in the closed liquidation case at the end of the function body.
    modifier solvent(address from) {
        _;
        require(_isSolvent(from, exchangeRate), 'Mx: insolvent');
    }

    // --- View methods ---

    // --- Write methods ---
    /// @notice Gets the exchange rate. I.e how much collateral to buy 1e18 asset.
    /// @dev This function is supposed to be invoked if needed because Oracle queries can be expensive.
    ///      Oracle should consider USD0 at 1$
    /// @return updated True if `exchangeRate` was updated.
    /// @return rate The new exchange rate.
    function updateExchangeRate() public returns (bool updated, uint256 rate) {
        (updated, rate) = oracle.get('');

        if (updated) {
            exchangeRate = rate;
            emit LogExchangeRate(rate);
        } else {
            // Return the old rate if fetching wasn't successful
            rate = exchangeRate;
        }
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

        uint256 extraAmount = 0;
        uint256 feeFraction = 0;

        // Calculate fees
        extraAmount =
            (uint256(_totalBorrow.elastic) *
                _accrueInfo.stabilityFee *
                elapsedTime) /
            1e18;
        _totalBorrow.elastic += uint128(extraAmount);

        uint256 feeAmount = (extraAmount * PROTOCOL_FEE) / PROTOCOL_FEE_DIVISOR; // % of interest paid goes to fee
        _accrueInfo.feesEarned += uint128(feeAmount);

        totalBorrow = _totalBorrow;
        accrueInfo = _accrueInfo;

        emit LogAccrue(extraAmount, feeFraction, _accrueInfo.stabilityFee);
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @param from Account to borrow for.
    /// @param to The receiver of borrowed tokens.
    /// @param amount Amount to borrow.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(
        address from,
        address to,
        uint256 amount
    ) public solvent(from) allowed(from) returns (uint256 part, uint256 share) {
        accrue();
        (part, share) = _borrow(from, to, amount);
    }

    /// @notice Repays a loan.
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        address from,
        address to,
        uint256 part
    ) public allowed(from) returns (uint256 amount) {
        accrue();
        amount = _repay(from, to, part);
    }

    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param from Account to transfer shares from.
    /// @param to The receiver of the tokens.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(
        address from,
        address to,
        bool skim,
        uint256 share
    ) public allowed(from) {
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        _addTokens(from, collateralId, share, oldTotalCollateralShare, skim);
        emit LogAddCollateral(skim ? address(yieldBox) : from, to, share);
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(
        address from,
        address to,
        uint256 share
    ) public solvent(from) allowed(from) {
        // accrue must be called because we check solvency
        accrue();

        _removeCollateral(from, to, share);
    }

    /// @notice Withdraw the fees accumulated in `accrueInfo.feesEarned` to the balance of `feeTo`.
    function withdrawFeesEarned(uint256 amount) public {
        accrue();

        require(amount > 0, 'Mx: Amount not valid');
        require(accrueInfo.feesEarned >= amount, 'Mx: Amount too big');

        uint256 balance = asset.balanceOf(address(this));
        require(balance >= amount, 'Mx: Not enough tokens');

        balanceOf[beachBar.feeTo()] += amount;
        accrueInfo.feesEarned -= uint128(amount);

        emit LogWithdrawFees(beachBar.feeTo(), amount);
    }

    /// @notice Withdraw the balance of `feeTo`, swap asset into TAP and deposit it to yieldBox of `feeTo`
    function depositFeesToYieldBox(
        MultiSwapper swapper,
        SwapData calldata swapData,
        uint256 amount
    ) public {
        if (accrueInfo.feesEarned > 0) {
            withdrawFeesEarned(amount);
        }
        require(beachBar.swappers(swapper), 'Mx: Invalid swapper');
        address _feeTo = beachBar.feeTo();
        address _feeVeTap = beachBar.feeVeTap();

        if (balanceOf[_feeTo] > 0) {
            uint256 feeShares = yieldBox.toShare(
                assetId,
                balanceOf[_feeTo],
                false
            );

            asset.approve(address(yieldBox), balanceOf[_feeTo]);
            yieldBox.depositAsset(
                assetId,
                address(this),
                address(this),
                balanceOf[_feeTo],
                0
            );

            balanceOf[_feeTo] = 0;
            yieldBox.transfer(
                address(this),
                address(swapper),
                assetId,
                feeShares
            );
            (uint256 tapAmount, ) = swapper.swap(
                assetId,
                beachBar.tapAssetId(),
                swapData.minAssetAmount,
                _feeVeTap,
                tapSwapPath,
                feeShares
            );

            emit LogYieldBoxFeesDeposit(feeShares, tapAmount);
        }
    }

    /// @notice Entry point for liquidations.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    /// @param collateralToAssetSwapData Extra swap data
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        MultiSwapper swapper,
        bytes calldata collateralToAssetSwapData
    ) external {
        // Oracle can fail but we still need to allow liquidations
        (, uint256 _exchangeRate) = updateExchangeRate();
        accrue();

        _closedLiquidation(
            users,
            maxBorrowParts,
            swapper,
            _exchangeRate,
            collateralToAssetSwapData
        );
    }

    // --- Owner methods ---
    /// @notice Used to set the swap path of closed liquidations
    /// @param _collateralSwapPath The Uniswap path .
    function setCollateralSwapPath(address[] calldata _collateralSwapPath)
        public
        onlyOwner
    {
        collateralSwapPath = _collateralSwapPath;
        emit LogCollateralSwapPath();
    }

    /// @notice Used to set the swap path of Asset -> TAP
    /// @param _tapSwapPath The Uniswap path .
    function setTapSwapPath(address[] calldata _tapSwapPath) public onlyOwner {
        tapSwapPath = _tapSwapPath;
        emit LogTapSwapPath();
    }

    /// @notice sets max borrowable amount
    function setBorrowCap(uint256 _cap) external onlyOwner {
        emit LogBorrowCapUpdated(totalBorrowCap, _cap);
        totalBorrowCap = _cap;
    }

    /// @notice Updates the stability fee
    /// @param _stabilityFee the new value
    function updateStabilityFee(uint64 _stabilityFee) external onlyOwner {
        emit LogStabilityFee(accrueInfo.stabilityFee, _stabilityFee);
        accrueInfo.stabilityFee = _stabilityFee;
    }

    /// @notice Updates the borrowing fee
    /// @param _borrowingFee the new value
    function updateBorrowingFee(uint256 _borrowingFee) external onlyOwner {
        emit LogBorrowingFee(borrowingFee, _borrowingFee);
        borrowingFee = _borrowingFee;
    }

    // --- Private methods ---
    /// @notice Concrete implementation of `isSolvent`. Includes a parameter to allow caching `exchangeRate`.
    /// @param _exchangeRate The exchange rate. Used to cache the `exchangeRate` between calls.
    function _isSolvent(address user, uint256 _exchangeRate)
        internal
        view
        returns (bool)
    {
        // accrue must have already been called!
        uint256 borrowPart = userBorrowPart[user];
        if (borrowPart == 0) return true;
        uint256 collateralShare = userCollateralShare[user];

        Rebase memory _totalBorrow = totalBorrow;

        return
            yieldBox.toAmount(
                collateralId,
                collateralShare *
                    (EXCHANGE_RATE_PRECISION / COLLATERIZATION_RATE_PRECISION) *
                    CLOSED_COLLATERIZATION_RATE,
                false
            ) >=
            // Moved exchangeRate here instead of dividing the other side to preserve more precision
            (borrowPart * _totalBorrow.elastic * _exchangeRate) /
                _totalBorrow.base;
    }

    /// @notice Handles the liquidation of users' balances, once the users' amount of collateral is too low.
    /// @dev Closed liquidations Only, 90% of extra shares goes to caller and 10% to protocol
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    /// @param swapData Swap necessar data
    function _closedLiquidation(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        MultiSwapper swapper,
        uint256 _exchangeRate,
        bytes calldata swapData
    ) private {
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
                    borrowPart = maxBorrowParts[i] > availableBorrowPart
                        ? availableBorrowPart
                        : maxBorrowParts[i];
                    userBorrowPart[user] = availableBorrowPart - borrowPart;
                }
                uint256 borrowAmount = _totalBorrow.toElastic(
                    borrowPart,
                    false
                );
                uint256 collateralShare = yieldBox.toShare(
                    collateralId,
                    (borrowAmount * LIQUIDATION_MULTIPLIER * _exchangeRate) /
                        (LIQUIDATION_MULTIPLIER_PRECISION *
                            EXCHANGE_RATE_PRECISION),
                    false
                );
                userCollateralShare[user] -= collateralShare;
                emit LogRemoveCollateral(
                    user,
                    address(swapper),
                    collateralShare
                );
                emit LogRepay(address(swapper), user, borrowAmount, borrowPart);

                // Keep totals
                allCollateralShare += collateralShare;
                allBorrowAmount += borrowAmount;
                allBorrowPart += borrowPart;
            }
        }
        require(allBorrowAmount != 0, 'Mx: solvent');
        _totalBorrow.elastic -= uint128(allBorrowAmount);
        _totalBorrow.base -= uint128(allBorrowPart);
        totalBorrow = _totalBorrow;
        totalCollateralShare -= allCollateralShare;

        uint256 allBorrowShare = yieldBox.toShare(
            assetId,
            allBorrowAmount,
            true
        );

        // Closed liquidation using a pre-approved swapper
        require(beachBar.swappers(swapper), 'Mx: Invalid swapper');

        // Swaps the users collateral for the borrowed asset
        yieldBox.transfer(
            address(this),
            address(swapper),
            collateralId,
            allCollateralShare
        );

        uint256 minAssetMount = 0;
        if (swapData.length > 0) {
            minAssetMount = abi.decode(swapData, (uint256));
        }
        uint256 balanceBefore = yieldBox.balanceOf(address(this), assetId);
        swapper.swap(
            collateralId,
            assetId,
            minAssetMount,
            address(this),
            collateralSwapPath,
            allCollateralShare
        );
        uint256 balanceAfter = yieldBox.balanceOf(address(this), assetId);

        uint256 returnedShare = balanceAfter - balanceBefore;
        uint256 extraShare = returnedShare - allBorrowShare;
        uint256 feeShare = (extraShare * PROTOCOL_FEE) / PROTOCOL_FEE_DIVISOR; // 10% of profit goes to fee.
        uint256 callerShare = (extraShare * CALLER_FEE) / CALLER_FEE_DIVISOR; //  1%  of profit goes to caller.

        yieldBox.transfer(address(this), beachBar.feeTo(), assetId, feeShare);
        yieldBox.transfer(address(this), msg.sender, assetId, callerShare);
    }

    /// @dev Helper function to move tokens.
    /// @param from Account to debit tokens from, in `yieldBox`.
    /// @param _tokenId The ERC-20 token asset ID in yieldBox.
    /// @param share The amount in shares to add.
    /// @param total Grand total amount to deduct from this contract's balance. Only applicable if `skim` is True.
    /// Only used for accounting checks.
    /// @param skim If True, only does a balance check on this contract.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    function _addTokens(
        address from,
        uint256 _tokenId,
        uint256 share,
        uint256 total,
        bool skim
    ) internal {
        if (skim) {
            require(
                share <= yieldBox.balanceOf(address(this), _tokenId) - total,
                'Mx: too much'
            );
        } else {
            yieldBox.transfer(from, address(this), _tokenId, share);
        }
    }

    /// @dev Concrete implementation of `removeCollateral`.
    function _removeCollateral(
        address from,
        address to,
        uint256 share
    ) internal {
        userCollateralShare[from] -= share;
        totalCollateralShare -= share;
        emit LogRemoveCollateral(from, to, share);
        yieldBox.transfer(address(this), to, collateralId, share);
    }

    /// @dev Concrete implementation of `repay`.
    function _repay(
        address from,
        address to,
        uint256 part
    ) internal returns (uint256 amount) {
        (totalBorrow, amount) = totalBorrow.sub(part, true);

        userBorrowPart[to] -= part;

        uint256 toWithdraw = userOpeningFeesAmount[from] >= part
            ? part
            : userOpeningFeesAmount[from];
        userOpeningFeesAmount[from] -= toWithdraw;

        toWithdraw += (amount - part); //acrrued
        uint256 toBurn = amount - toWithdraw;

        yieldBox.withdraw(assetId, from, address(this), amount, 0);
        //burn USD0
        if (toBurn > 0) {
            asset.burn(address(this), toBurn);
        }

        emit LogRepay(from, to, amount, part);
    }

    //TODO: accrue fees when re-borrowing
    /// @dev Concrete implementation of `borrow`.
    function _borrow(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 part, uint256 share) {
        uint256 feeAmount = (amount * borrowingFee) /
            BORROW_OPENING_FEE_PRECISION; // A flat % fee is charged for any borrow

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);
        require(
            totalBorrowCap == 0 || totalBorrow.base <= totalBorrowCap,
            'Mx: borrow cap reached'
        );

        userOpeningFeesAmount[from] += feeAmount;
        userBorrowPart[from] += part;

        //mint USD0
        asset.mint(address(this), amount);

        //deposit borrowed amount to user
        asset.approve(address(yieldBox), amount);
        yieldBox.depositAsset(assetId, address(this), to, amount, 0);

        //accrue opening fee
        accrueInfo.feesEarned += uint128(feeAmount);

        share = yieldBox.toShare(assetId, amount, false);

        emit LogBorrow(from, to, amount, feeAmount, part);
    }
}
