// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {ISingularity, IMarket} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SGLStorage} from "./SGLStorage.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGLCommon is SGLStorage {
    using RebaseLibrary for Rebase;
    using SafeCast for uint256;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error TooMuch();
    error MinLimit();
    error TransferFailed();

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Accrues the interest on the borrowed tokens and handles the accumulation of fees.
    function accrue() external {
        _accrue();
    }

    function getInterestDetails()
        external
        view
        returns (ISingularity.AccrueInfo memory _accrueInfo, uint256 utilization)
    {
        (_accrueInfo,,,,, utilization,) = _getInterestRate();
    }

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _getInterestRate()
        internal
        view
        returns (
            ISingularity.AccrueInfo memory _accrueInfo,
            Rebase memory _totalBorrow,
            Rebase memory _totalAsset,
            uint256 extraAmount,
            uint256 feeFraction,
            uint256 utilization,
            bool logStartingInterest
        )
    {
        _accrueInfo = accrueInfo;
        _totalBorrow = totalBorrow;
        _totalAsset = totalAsset;
        extraAmount = 0;
        feeFraction = 0;
        logStartingInterest = false;

        uint256 fullAssetAmount = yieldBox.toAmount(assetId, _totalAsset.elastic, false) + _totalBorrow.elastic;

        utilization =
            fullAssetAmount == 0 ? 0 : (uint256(_totalBorrow.elastic) * UTILIZATION_PRECISION) / fullAssetAmount;

        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - _accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return (_accrueInfo, totalBorrow, totalAsset, 0, 0, utilization, logStartingInterest);
        }
        _accrueInfo.lastAccrued = block.timestamp.toUint64();

        if (_totalBorrow.base == 0) {
            // If there are no borrows, reset the interest rate
            if (_accrueInfo.interestPerSecond != startingInterestPerSecond) {
                _accrueInfo.interestPerSecond = startingInterestPerSecond;
                logStartingInterest = true;
            }
            return (_accrueInfo, _totalBorrow, totalAsset, 0, 0, utilization, logStartingInterest);
        }

        // Accrue interest
        extraAmount = (uint256(_totalBorrow.elastic) * _accrueInfo.interestPerSecond * elapsedTime) / 1e18;
        _totalBorrow.elastic += extraAmount.toUint128();

        //take accrued values into account
        fullAssetAmount = yieldBox.toAmount(assetId, _totalAsset.elastic, false) + _totalBorrow.elastic;

        uint256 feeAmount = (extraAmount * protocolFee) / FEE_PRECISION; // % of interest paid goes to fee
        feeFraction = (feeAmount * _totalAsset.base) / (fullAssetAmount - feeAmount);
        _accrueInfo.feesEarnedFraction += feeFraction.toUint128();
        _totalAsset.base = _totalAsset.base + feeFraction.toUint128();

        utilization =
            fullAssetAmount == 0 ? 0 : (uint256(_totalBorrow.elastic) * UTILIZATION_PRECISION) / fullAssetAmount;

        // Update interest rate
        if (utilization < minimumTargetUtilization) {
            uint256 underFactor =
                ((minimumTargetUtilization - utilization) * FACTOR_PRECISION) / minimumTargetUtilization;
            uint256 scale = interestElasticity + (underFactor * underFactor * elapsedTime);
            _accrueInfo.interestPerSecond =
                ((uint256(_accrueInfo.interestPerSecond) * interestElasticity) / scale).toUint64();
            if (_accrueInfo.interestPerSecond < minimumInterestPerSecond) {
                _accrueInfo.interestPerSecond = minimumInterestPerSecond; // 0.25% APR minimum
            }
        } else if (utilization > maximumTargetUtilization) {
            uint256 overFactor = ((utilization - maximumTargetUtilization) * FACTOR_PRECISION) / fullUtilizationMinusMax;
            uint256 scale = interestElasticity + (overFactor * overFactor * elapsedTime);
            uint256 newInterestPerSecond = (uint256(_accrueInfo.interestPerSecond) * scale) / interestElasticity;
            if (newInterestPerSecond > maximumInterestPerSecond) {
                newInterestPerSecond = maximumInterestPerSecond; // 1000% APR maximum
            }
            _accrueInfo.interestPerSecond = newInterestPerSecond.toUint64();
        }
    }

    function _accrueView() internal view override returns (Rebase memory _totalBorrow) {
        (, _totalBorrow,,,,,) = _getInterestRate();
    }

    function _accrue() internal override {
        (
            ISingularity.AccrueInfo memory _accrueInfo,
            Rebase memory _totalBorrow,
            Rebase memory _totalAsset,
            uint256 extraAmount,
            uint256 feeFraction,
            uint256 utilization,
            bool logStartingInterest
        ) = _getInterestRate();

        if (logStartingInterest) {
            emit LogAccrue(0, 0, startingInterestPerSecond, 0);
        } else {
            emit LogAccrue(extraAmount, feeFraction, _accrueInfo.interestPerSecond, utilization);
        }
        accrueInfo = _accrueInfo;
        totalBorrow = _totalBorrow;
        totalAsset = _totalAsset;
    }

    /// @dev Helper function to move tokens.
    /// @param from Account to debit tokens from, in `yieldBox`.
    /// @param _assetId The ERC-20 token asset ID in yieldBox.
    /// @param share The amount in shares to add.
    /// @param total Grand total amount to deduct from this contract's balance. Only applicable if `skim` is True.
    /// Only used for accounting checks.
    /// @param skim If True, only does a balance check on this contract.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    function _addTokens(address from, address, uint256 _assetId, uint256 share, uint256 total, bool skim) internal {
        if (skim) {
            if (share > yieldBox.balanceOf(address(this), _assetId) - total) {
                revert TooMuch();
            }
        } else {
            // yieldBox.transfer(from, address(this), _assetId, share);
            bool isErr = pearlmit.transferFromERC1155(from, address(this), address(yieldBox), _assetId, share);
            if (isErr) {
                revert TransferFailed();
            }
        }
    }

    /// @dev Concrete implementation of `addAsset`.
    function _addAsset(address from, address to, bool skim, uint256 share) internal returns (uint256 fraction) {
        Rebase memory _totalAsset = totalAsset;
        uint256 totalAssetShare = _totalAsset.elastic;
        uint256 allShare = _totalAsset.elastic + yieldBox.toShare(assetId, totalBorrow.elastic, true);
        fraction = allShare == 0 ? share : (share * _totalAsset.base) / allShare;
        if (_totalAsset.base + fraction.toUint128() < 1000) {
            return 0;
        }
        totalAsset = _totalAsset.add(share, fraction);

        balanceOf[to] += fraction;
        emit Transfer(address(0), to, fraction);

        _addTokens(from, to, assetId, share, totalAssetShare, skim);
        emit LogAddAsset(skim ? address(yieldBox) : from, to, share, fraction);
    }

    /// @dev Concrete implementation of `removeAsset`.
    /// @param from The account to remove from. Should always be msg.sender except for `depositFeesToyieldBox()`.
    function _removeAsset(address from, address to, uint256 fraction) internal returns (uint256 share) {
        if (totalAsset.base == 0) {
            return 0;
        }
        Rebase memory _totalAsset = totalAsset;
        uint256 allShare = _totalAsset.elastic + yieldBox.toShare(assetId, totalBorrow.elastic, false);
        share = (fraction * allShare) / _totalAsset.base;

        _totalAsset.base -= fraction.toUint128();
        if (_totalAsset.base < 1000) revert MinLimit();

        balanceOf[from] -= fraction;
        emit Transfer(from, address(0), fraction);
        _totalAsset.elastic -= share.toUint128();
        totalAsset = _totalAsset;
        emit LogRemoveAsset(from, to, share, fraction);
        yieldBox.transfer(address(this), to, assetId, share);
    }

    /// @dev Return the equivalent of collateral borrow part in asset amount.
    function _getAmountForBorrowPart(uint256 borrowPart) internal view returns (uint256) {
        return totalBorrow.toElastic(borrowPart, false);
    }

    function _isWhitelisted(uint16 _chainId, address _contract) internal view returns (bool) {
        return ICluster(penrose.cluster()).isWhitelisted(_chainId, _contract);
    }

    struct _ViewLiquidationStruct {
        address user;
        uint256 maxBorrowPart;
        uint256 minLiquidationBonus;
        uint256 exchangeRate;
        IYieldBox yieldBox;
        uint256 collateralId;
        uint256 userCollateralShare;
        uint256 userBorrowPart;
        Rebase totalBorrow;
        uint256 liquidationBonusAmount;
        uint256 liquidationCollateralizationRate;
        uint256 liquidationMultiplier;
        uint256 exchangeRatePrecision;
        uint256 feeDecimalsPrecision;
    }
}
