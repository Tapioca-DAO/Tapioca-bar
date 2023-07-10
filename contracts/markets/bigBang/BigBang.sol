// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import "tapioca-periph/contracts/interfaces/IBigBang.sol";
import "tapioca-periph/contracts/interfaces/ISendFrom.sol";
import "tapioca-periph/contracts/interfaces/ISwapper.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";

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
    /// @notice event emitted when accrue is called
    event LogAccrue(uint256 accruedAmount, uint64 rate);
    /// @notice event emitted when collateral is added
    event LogAddCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    /// @notice event emitted when collateral is removed
    event LogRemoveCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    /// @notice event emitted when borrow is performed
    event LogBorrow(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 feeAmount,
        uint256 part
    );
    /// @notice event emitted when a repay operation is performed
    event LogRepay(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 part
    );
    /// @notice event emitted when the minimum debt rate is updated
    event MinDebtRateUpdated(uint256 oldVal, uint256 newVal);
    /// @notice event emitted when the maximum debt rate is updated
    event MaxDebtRateUpdated(uint256 oldVal, uint256 newVal);
    /// @notice event emitted when the debt rate against the main market is updated
    event DebtRateAgainstEthUpdated(uint256 oldVal, uint256 newVal);

    constructor() MarketERC20("Tapioca BigBang") {}

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

        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision > 0
            ? _exchangeRatePrecision
            : 1e18;

        _isEthMarket = collateralId == penrose.wethAssetId();
        if (!_isEthMarket) {
            if (minDebtRate != 0 && maxDebtRate != 0) {
                require(
                    minDebtRate < maxDebtRate,
                    "BigBang: debt rates not valid"
                );
                require(
                    maxDebtRate <= 1e18,
                    "BigBang: max debt rate not valid"
                );
            }
            debtRateAgainstEthMarket = _debtRateAgainstEth;
            maxDebtRate = _debtRateMax;
            minDebtRate = _debtRateMin;
            debtStartPoint = _debtStartPoint;
        }

        minLiquidatorReward = 1e3;
        maxLiquidatorReward = 1e4;
        liquidationBonusAmount = 1e4;
        borrowOpeningFee = 50; // 0.05%
        liquidationMultiplier = 12000; //12%
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

        if (debt > maxDebtRate) return maxDebtRate;

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
        _accrue();
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
    ) external notPaused solvent(from) returns (uint256 part, uint256 share) {
        uint256 allowanceShare = _computeAllowanceAmountInAsset(
            from,
            exchangeRate,
            amount,
            asset.safeDecimals()
        );
        _allowedBorrow(from, allowanceShare);
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
    ) external notPaused allowedBorrow(from, part) returns (uint256 amount) {
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
        uint256 amount,
        uint256 share
    ) external allowedBorrow(from, share) notPaused {
        _addCollateral(from, to, skim, amount, share);
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(
        address from,
        address to,
        uint256 share
    ) external notPaused solvent(from) allowedBorrow(from, share) {
        _removeCollateral(from, to, share);
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
        require(
            users.length == maxBorrowParts.length,
            "BigBang: length mismatch"
        );
        // Oracle can fail but we still need to allow liquidations
        (, uint256 _exchangeRate) = updateExchangeRate();
        _accrue();

        _closedLiquidation(
            users,
            maxBorrowParts,
            swapper,
            _exchangeRate,
            collateralToAssetSwapData
        );
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param minAmountOut Minimal collateral amount to receive
    /// @param swapper Swapper to execute the purchase
    /// @param dexData Additional data to pass to the swapper
    /// @return amountOut Actual collateral amount purchased
    function buyCollateral(
        address from,
        uint256 borrowAmount,
        uint256 supplyAmount,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    ) external notPaused solvent(from) returns (uint256 amountOut) {
        require(penrose.swappers(swapper), "SGL: Invalid swapper");

        // Let this fail first to save gas:
        uint256 supplyShare = yieldBox.toShare(assetId, supplyAmount, true);
        if (supplyShare > 0) {
            yieldBox.transfer(from, address(swapper), assetId, supplyShare);
        }

        uint256 borrowShare;
        (, borrowShare) = _borrow(from, address(swapper), borrowAmount);

        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            assetId,
            collateralId,
            0,
            supplyShare + borrowShare,
            true,
            true
        );

        uint256 collateralShare;
        (amountOut, collateralShare) = swapper.swap(
            swapData,
            minAmountOut,
            from,
            dexData
        );
        require(amountOut >= minAmountOut, "SGL: not enough");

        _allowedBorrow(from, collateralShare);
        _addCollateral(from, from, false, 0, collateralShare);
    }

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param minAmountOut Minimal proceeds required for the sale
    /// @param swapper Swapper to execute the sale
    /// @param dexData Additional data to pass to the swapper
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(
        address from,
        uint256 share,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    ) external notPaused solvent(from) returns (uint256 amountOut) {
        require(penrose.swappers(swapper), "SGL: Invalid swapper");

        _allowedBorrow(from, share);
        _removeCollateral(from, address(swapper), share);
        ISwapper.SwapData memory swapData = swapper.buildSwapData(
            collateralId,
            assetId,
            0,
            share,
            true,
            true
        );
        uint256 shareOut;
        (amountOut, shareOut) = swapper.swap(
            swapData,
            minAmountOut,
            from,
            dexData
        );
        // As long as the ratio is correct, we trust `amountOut` resp.
        // `shareOut`, because all money received by the swapper gets used up
        // one way or another, or the transaction will revert.
        require(amountOut >= minAmountOut, "SGL: not enough");
        uint256 partOwed = userBorrowPart[from];
        uint256 amountOwed = totalBorrow.toElastic(partOwed, true);
        uint256 shareOwed = yieldBox.toShare(assetId, amountOwed, true);
        if (shareOwed <= shareOut) {
            _repay(from, from, partOwed);
        } else {
            //repay as much as we can
            uint256 partOut = totalBorrow.toBase(amountOut, false);
            _repay(from, from, partOut);
        }
    }

    function transfer(address, uint256) public override returns (bool) {}

    function transferFrom(
        address,
        address,
        uint256
    ) public override returns (bool) {}

    // ************************* //
    // *** OWNER FUNCTIONS ***** //
    // ************************* //

    /// @notice Transfers fees to penrose
    function refreshPenroseFees(
        address
    ) external onlyOwner notPaused returns (uint256 feeShares) {
        uint256 balance = asset.balanceOf(address(this));
        totalFees += balance;
        feeShares = yieldBox.toShare(assetId, totalFees, false);

        if (totalFees > 0) {
            asset.approve(address(yieldBox), 0);
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

    /// @notice sets BigBang specific configuration
    /// @dev values are updated only if > 0 or not address(0)
    function setBigBangConfig(
        uint256 _minDebtRate,
        uint256 _maxDebtRate,
        uint256 _debtRateAgainstEthMarket,
        uint256 _liquidationMultiplier
    ) external onlyOwner {
        _isEthMarket = collateralId == penrose.wethAssetId();

        if (!_isEthMarket) {
            if (_minDebtRate > 0) {
                require(_minDebtRate < maxDebtRate, "BigBang: not valid");
                emit MinDebtRateUpdated(minDebtRate, _minDebtRate);
                minDebtRate = _minDebtRate;
            }

            if (_maxDebtRate > 0) {
                require(_maxDebtRate > minDebtRate, "BigBang: not valid");
                emit MaxDebtRateUpdated(maxDebtRate, _maxDebtRate);
                maxDebtRate = _maxDebtRate;
            }

            if (_debtRateAgainstEthMarket > 0) {
                emit DebtRateAgainstEthUpdated(
                    debtRateAgainstEthMarket,
                    _debtRateAgainstEthMarket
                );
                debtRateAgainstEthMarket = _debtRateAgainstEthMarket;
            }

            if (_liquidationMultiplier > 0) {
                require(
                    _liquidationMultiplier < FEE_PRECISION,
                    "BigBang: not valid"
                );
                emit LiquidationMultiplierUpdated(
                    liquidationMultiplier,
                    _liquidationMultiplier
                );
                liquidationMultiplier = _liquidationMultiplier;
            }
        }
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _accrue() internal override {
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

    function _addCollateral(
        address from,
        address to,
        bool skim,
        uint256 amount,
        uint256 share
    ) internal {
        if (share == 0) {
            share = yieldBox.toShare(collateralId, amount, false);
        }
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        _addTokens(from, collateralId, share, oldTotalCollateralShare, skim);
        emit LogAddCollateral(skim ? address(yieldBox) : from, to, share);
    }

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
        (uint256 feeShare, uint256 callerShare) = _extractLiquidationFees(
            returnedShare,
            borrowShare,
            callerReward
        );
        address[] memory _users = new address[](1);
        _users[0] = user;
        emit Liquidated(
            msg.sender,
            _users,
            callerShare,
            feeShare,
            borrowAmount,
            collateralShare
        );
    }

    function _extractLiquidationFees(
        uint256 returnedShare,
        uint256 borrowShare,
        uint256 callerReward
    ) private returns (uint256 feeShare, uint256 callerShare) {
        uint256 extraShare = returnedShare - borrowShare;
        feeShare = (extraShare * protocolFee) / FEE_PRECISION; // x% of profit goes to fee.
        callerShare = (extraShare * callerReward) / FEE_PRECISION; //  y%  of profit goes to caller.

        yieldBox.transfer(address(this), penrose.feeTo(), assetId, feeShare);
        yieldBox.transfer(address(this), msg.sender, assetId, callerShare);
    }

    /// @notice Handles the liquidation of users' balances, once the users' amount of collateral is too low.
    /// @dev Closed liquidations Only, 90% of extra shares goes to caller and 10% to protocol
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    /// @param swapData Swap necessary data
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

        uint256 toWithdraw = (amount - part); //accrued
        uint256 toBurn = amount - toWithdraw;
        yieldBox.withdraw(assetId, from, address(this), amount, 0);
        //burn USDO
        if (toBurn > 0) {
            IUSDOBase(address(asset)).burn(address(this), toBurn);
        }

        emit LogRepay(from, to, amount, part);
    }

    /// @dev Concrete implementation of `borrow`.
    function _borrow(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 part, uint256 share) {
        uint256 feeAmount = (amount * borrowOpeningFee) / FEE_PRECISION; // A flat % fee is charged for any borrow

        (totalBorrow, part) = totalBorrow.add(amount + feeAmount, true);
        require(
            totalBorrowCap == 0 || totalBorrow.elastic <= totalBorrowCap,
            "BigBang: borrow cap reached"
        );

        userBorrowPart[from] += part;

        //mint USDO
        IUSDOBase(address(asset)).mint(address(this), amount);

        //deposit borrowed amount to user
        asset.approve(address(yieldBox), 0);
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
        require(_exchangeRate > 0, "BigBang: exchangeRate not valid");
        uint256 collateralPartInAsset = (yieldBox.toAmount(
            collateralId,
            userCollateralShare[user],
            false
        ) * EXCHANGE_RATE_PRECISION) / _exchangeRate;

        uint256 borrowAssetDecimals = asset.safeDecimals();
        uint256 collateralDecimals = collateral.safeDecimals();

        uint256 availableBorrowPart = computeClosingFactor(
            userBorrowPart[user],
            collateralPartInAsset,
            borrowAssetDecimals,
            collateralDecimals,
            FEE_PRECISION_DECIMALS
        );
        borrowPart = maxBorrowPart > availableBorrowPart
            ? availableBorrowPart
            : maxBorrowPart;

        if (borrowPart > userBorrowPart[user]) {
            borrowPart = userBorrowPart[user];
        }

        userBorrowPart[user] = userBorrowPart[user] - borrowPart;

        borrowAmount = totalBorrow.toElastic(borrowPart, false);
        uint256 amountWithBonus = borrowAmount +
            (borrowAmount * liquidationMultiplier) /
            FEE_PRECISION;
        collateralShare = yieldBox.toShare(
            collateralId,
            (amountWithBonus * _exchangeRate) / EXCHANGE_RATE_PRECISION,
            false
        );
        if (collateralShare > userCollateralShare[user]) {
            collateralShare = userCollateralShare[user];
        }
        userCollateralShare[user] -= collateralShare;
        require(borrowAmount != 0, "SGL: solvent");

        totalBorrow.elastic -= uint128(borrowAmount);
        totalBorrow.base -= uint128(borrowPart);
    }
}
