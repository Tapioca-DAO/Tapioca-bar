// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import "tapioca-periph/contracts/interfaces/IBigBang.sol";
import "tapioca-periph/contracts/interfaces/ISendFrom.sol";
import "tapioca-periph/contracts/interfaces/ISwapper.sol";
import "../Market.sol";

// solhint-disable max-line-length
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

contract BigBang is BoringOwnable, Market {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    mapping(address => mapping(address => bool)) public operators;

    IBigBang.AccrueInfo public accrueInfo;

    // map of operator approval
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    uint256 public borrowingFee;

    uint256 public totalFees;

    bool private _isEthMarket;
    uint256 public maxDebtRate;
    uint256 public minDebtRate;
    uint256 public debtRateAgainstEthMarket;
    uint256 public debtStartPoint;
    uint256 private constant DEBT_PRECISION = 1e18;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event LogAccrue(uint256 accruedAmount, uint64 rate);
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
    event LogApprovalForAll(
        address indexed _from,
        address indexed _operator,
        bool _approved
    );
    event LogBorrowingFee(uint256 _oldVal, uint256 _newVal);

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //
    uint256 private constant LIQUIDATION_MULTIPLIER = 112000; // add 12%
    uint256 private constant MAX_BORROWING_FEE = 8e4; //at 80% for testing; TODO
    uint256 private constant MAX_STABILITY_FEE = 8e17; //at 80% for testing; TODO

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //
    /// Modifier to check if the msg.sender is allowed to use funds belonging to the 'from' address.
    /// If 'from' is msg.sender, it's allowed.
    /// If 'msg.sender' is an address (an operator) that is approved by 'from', it's allowed.
    modifier allowed(address from) virtual {
        if (from != msg.sender && !operators[from][msg.sender]) {
            revert NotApproved(from, msg.sender);
        }
        _;
    }

    /// @notice The init function that acts as a constructor
    function init(bytes calldata data) external onlyOnce {
        (
            IPenrose tapiocaBar_,
            IERC20 _collateral,
            uint256 _collateralId,
            IOracle _oracle,
            uint256 _exchangeRatePrecision,
            uint256 _debtRateAgainstEth,
            uint256 _debtRateMin,
            uint256 _debtRateMax,
            uint256 _debtStartPoint
        ) = abi.decode(
                data,
                (
                    IPenrose,
                    IERC20,
                    uint256,
                    IOracle,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256
                )
            );

        penrose = tapiocaBar_;
        yieldBox = YieldBox(tapiocaBar_.yieldBox());
        owner = address(penrose);

        address _asset = penrose.usdoToken();

        require(
            address(_collateral) != address(0) &&
                address(_asset) != address(0) &&
                address(_oracle) != address(0),
            "BigBang: bad pair"
        );

        asset = IERC20(_asset);
        assetId = penrose.usdoAssetId();
        collateral = _collateral;
        collateralId = _collateralId;
        oracle = _oracle;

        updateExchangeRate();

        callerFee = 90000; // 90%
        protocolFee = 10000; // 10%
        collateralizationRate = 75000; // 75%

        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision;

        _isEthMarket = collateralId == penrose.wethAssetId();
        if (!_isEthMarket) {
            debtRateAgainstEthMarket = _debtRateAgainstEth;
            maxDebtRate = _debtRateMax;
            minDebtRate = _debtRateMin;
            debtStartPoint = _debtStartPoint;
        }

        minLiquidatorReward = 1e3;
        maxLiquidatorReward = 1e4;
        liquidationBonusAmount = 1e4;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns total market debt
    function getTotalDebt() external view returns (uint256) {
        return totalBorrow.elastic;
    }

    /// @notice returns the current debt rate
    function getDebtRate() public view returns (uint256) {
        if (_isEthMarket) return penrose.bigBangEthDebtRate(); // default 0.5%
        if (totalBorrow.elastic == 0) return minDebtRate;

        uint256 _ethMarketTotalDebt = BigBang(penrose.bigBangEthMarket())
            .getTotalDebt();
        uint256 _currentDebt = totalBorrow.elastic;
        uint256 _maxDebtPoint = (_ethMarketTotalDebt *
            debtRateAgainstEthMarket) / 1e18;

        if (_currentDebt >= _maxDebtPoint) return maxDebtRate;

        uint256 debtPercentage = ((_currentDebt - debtStartPoint) *
            DEBT_PRECISION) / (_maxDebtPoint - debtStartPoint);
        uint256 debt = ((maxDebtRate - minDebtRate) * debtPercentage) /
            DEBT_PRECISION +
            minDebtRate;

        return debt;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Allows batched call to BingBang.
    /// @param calls An array encoded call data.
    /// @param revertOnFail If True then reverts after a failed call and stops doing further calls.
    function execute(
        bytes[] calldata calls,
        bool revertOnFail
    ) external returns (bool[] memory successes, string[] memory results) {
        successes = new bool[](calls.length);
        results = new string[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(
                calls[i]
            );
            require(success || !revertOnFail, _getRevertMsg(result));
            successes[i] = success;
            results[i] = _getRevertMsg(result);
        }
    }

    /// @notice allows 'operator' to act on behalf of the sender
    /// @param status true/false
    function updateOperator(address operator, bool status) external {
        operators[msg.sender][operator] = status;
    }

    /// @notice Accrues the interest on the borrowed tokens and handles the accumulation of fees.
    function accrue() public {
        IBigBang.AccrueInfo memory _accrueInfo = accrueInfo;
        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - _accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return;
        }
        //update debt rate
        uint256 annumDebtRate = getDebtRate();
        _accrueInfo.debtRate = uint64(annumDebtRate / 31536000); //per second

        _accrueInfo.lastAccrued = uint64(block.timestamp);

        Rebase memory _totalBorrow = totalBorrow;

        uint256 extraAmount = 0;

        // Calculate fees
        extraAmount =
            (uint256(_totalBorrow.elastic) *
                _accrueInfo.debtRate *
                elapsedTime) /
            1e18;
        _totalBorrow.elastic += uint128(extraAmount);

        totalBorrow = _totalBorrow;
        accrueInfo = _accrueInfo;

        emit LogAccrue(extraAmount, _accrueInfo.debtRate);
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
    )
        public
        notPaused
        solvent(from)
        allowed(from)
        returns (uint256 part, uint256 share)
    {
        updateExchangeRate();

        accrue();

        (part, share) = _borrow(from, to, amount);
    }

    /// @notice Repays a loan.
    /// @dev The bool param is not used but we added it to respect the ISingularity interface for MarketsHelper compatibility
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        address from,
        address to,
        bool,
        uint256 part
    ) public notPaused allowed(from) returns (uint256 amount) {
        updateExchangeRate();

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
    ) public notPaused allowed(from) {
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
    ) public notPaused solvent(from) allowed(from) {
        updateExchangeRate();

        // accrue must be called because we check solvency
        accrue();

        _removeCollateral(from, to, share);
    }

    /// @notice Transfers fees to penrose
    function refreshPenroseFees(
        address
    ) external onlyOwner notPaused returns (uint256 feeShares) {
        uint256 balance = asset.balanceOf(address(this));
        totalFees += balance;
        feeShares = yieldBox.toShare(assetId, totalFees, false);

        if (totalFees > 0) {
            asset.approve(address(yieldBox), totalFees);

            yieldBox.depositAsset(
                assetId,
                address(this),
                msg.sender,
                totalFees,
                0
            );

            totalFees = 0;
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
        ISwapper swapper,
        bytes calldata collateralToAssetSwapData
    ) external notPaused {
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

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice Updates the borrowing fee
    /// @param _borrowingFee the new value
    function updateBorrowingFee(uint256 _borrowingFee) external onlyOwner {
        require(_borrowingFee <= MAX_BORROWING_FEE, "BigBang: value not valid");
        emit LogBorrowingFee(borrowingFee, _borrowingFee);
        borrowingFee = _borrowingFee;
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _liquidateUser(
        address user,
        uint256 maxBorrowPart,
        ISwapper swapper,
        uint256 _exchangeRate,
        bytes calldata _dexData
    ) private {
        if (_isSolvent(user, _exchangeRate)) return;

        (
            uint256 startTVLInAsset,
            uint256 maxTVLInAsset
        ) = _computeMaxAndMinLTVInAsset(
                userCollateralShare[user],
                _exchangeRate
            );
        uint256 callerReward = _getCallerReward(
            userBorrowPart[user],
            startTVLInAsset,
            maxTVLInAsset
        );

        (
            uint256 borrowAmount,
            uint256 borrowPart,
            uint256 collateralShare
        ) = _updateBorrowAndCollateralShare(user, maxBorrowPart, _exchangeRate);
        emit LogRemoveCollateral(user, address(swapper), collateralShare);
        emit LogRepay(address(swapper), user, borrowAmount, borrowPart);

        uint256 borrowShare = yieldBox.toShare(assetId, borrowAmount, true);

        // Closed liquidation using a pre-approved swapper
        require(penrose.swappers(swapper), "BigBang: Invalid swapper");

        // Swaps the users collateral for the borrowed asset
        yieldBox.transfer(
            address(this),
            address(swapper),
            collateralId,
            collateralShare
        );

        uint256 minAssetMount = 0;
        if (_dexData.length > 0) {
            minAssetMount = abi.decode(_dexData, (uint256));
        }

        uint256 balanceBefore = yieldBox.balanceOf(address(this), assetId);

        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            collateralId,
            assetId,
            0,
            collateralShare,
            true,
            true
        );
        swapper.swap(swapData, minAssetMount, address(this), "");
        uint256 balanceAfter = yieldBox.balanceOf(address(this), assetId);

        uint256 returnedShare = balanceAfter - balanceBefore;
        _extractLiquidationFees(returnedShare, borrowShare, callerReward);
    }

    function _extractLiquidationFees(
        uint256 returnedShare,
        uint256 borrowShare,
        uint256 callerReward
    ) private {
        uint256 extraShare = returnedShare - borrowShare;
        uint256 feeShare = (extraShare * protocolFee) / FEE_PRECISION; // x% of profit goes to fee.
        uint256 callerShare = (extraShare * callerReward) / FEE_PRECISION; //  y%  of profit goes to caller.

        yieldBox.transfer(address(this), penrose.feeTo(), assetId, feeShare);
        yieldBox.transfer(address(this), msg.sender, assetId, callerShare);
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
        ISwapper swapper,
        uint256 _exchangeRate,
        bytes calldata swapData
    ) private {
        uint256 liquidatedCount = 0;
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (!_isSolvent(user, _exchangeRate)) {
                liquidatedCount++;
                _liquidateUser(
                    user,
                    maxBorrowParts[i],
                    swapper,
                    _exchangeRate,
                    swapData
                );
            }
        }

        require(liquidatedCount > 0, "SGL: no users found");
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
                "BigBang: too much"
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

        uint256 toWithdraw = (amount - part); //acrrued
        uint256 toBurn = amount - toWithdraw;
        yieldBox.withdraw(assetId, from, address(this), amount, 0);
        //burn USDO
        if (toBurn > 0) {
            IUSDO(address(asset)).burn(address(this), toBurn);
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
        uint256 feeAmount = (amount * borrowingFee) / FEE_PRECISION; // A flat % fee is charged for any borrow

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);
        require(
            totalBorrowCap == 0 || totalBorrow.elastic <= totalBorrowCap,
            "BigBang: borrow cap reached"
        );

        userBorrowPart[from] += part;

        //mint USDO
        IUSDO(address(asset)).mint(address(this), amount);

        //deposit borrowed amount to user
        asset.approve(address(yieldBox), amount);
        yieldBox.depositAsset(assetId, address(this), to, amount, 0);

        share = yieldBox.toShare(assetId, amount, false);

        emit LogBorrow(from, to, amount, feeAmount, part);
    }

    function _updateBorrowAndCollateralShare(
        address user,
        uint256 maxBorrowPart,
        uint256 _exchangeRate
    )
        private
        returns (
            uint256 borrowAmount,
            uint256 borrowPart,
            uint256 collateralShare
        )
    {
        uint256 availableBorrowPart = computeClosingFactor(user, _exchangeRate);
        borrowPart = maxBorrowPart > availableBorrowPart
            ? availableBorrowPart
            : maxBorrowPart;

        userBorrowPart[user] = userBorrowPart[user] - borrowPart;

        borrowAmount = totalBorrow.toElastic(borrowPart, false);
        collateralShare = yieldBox.toShare(
            collateralId,
            (borrowAmount * LIQUIDATION_MULTIPLIER * _exchangeRate) /
                (LIQUIDATION_MULTIPLIER_PRECISION * EXCHANGE_RATE_PRECISION),
            false
        );
        userCollateralShare[user] -= collateralShare;
        require(borrowAmount != 0, "SGL: solvent");

        totalBorrow.elastic -= uint128(borrowAmount);
        totalBorrow.base -= uint128(borrowPart);
    }
}
