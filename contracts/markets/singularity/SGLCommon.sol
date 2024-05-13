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
        (_accrueInfo,,,,, utilization) = _getInterestRate();
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
            uint256 utilization
        )
    {
        _accrueInfo = accrueInfo;
        _totalBorrow = totalBorrow;
        _totalAsset = totalAsset;
        extraAmount = 0;
        feeFraction = 0;

        uint256 fullAssetAmount = yieldBox.toAmount(assetId, _totalAsset.elastic, false) + _totalBorrow.elastic;

        utilization =
            fullAssetAmount == 0 ? 0 : (uint256(_totalBorrow.elastic) * UTILIZATION_PRECISION) / fullAssetAmount;

        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - _accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return (_accrueInfo, totalBorrow, totalAsset, 0, 0, utilization);
        }
        _accrueInfo.lastAccrued = block.timestamp.toUint64();

        if (_totalBorrow.base == 0) {
            // If there are no borrows, reset the interest rate
            if (_accrueInfo.interestPerSecond != startingInterestPerSecond) {
                _accrueInfo.interestPerSecond = startingInterestPerSecond;
            }
            return (_accrueInfo, _totalBorrow, totalAsset, 0, 0, utilization);
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
                ((minimumTargetUtilization - utilization) * 1e18) / minimumTargetUtilization;
            uint256 scale = interestElasticity + (underFactor * underFactor * elapsedTime);
            _accrueInfo.interestPerSecond =
                ((uint256(_accrueInfo.interestPerSecond) * interestElasticity) / scale).toUint64();
            if (_accrueInfo.interestPerSecond < minimumInterestPerSecond) {
                _accrueInfo.interestPerSecond = minimumInterestPerSecond; // 0.25% APR minimum
            }
        } else if (utilization > maximumTargetUtilization) {
            uint256 overFactor = ((utilization - maximumTargetUtilization) * 1e18) / (FULL_UTILIZATION - maximumTargetUtilization);
            uint256 scale = interestElasticity + (overFactor * overFactor * elapsedTime);
            uint256 newInterestPerSecond = (uint256(_accrueInfo.interestPerSecond) * scale) / interestElasticity;
            if (newInterestPerSecond > maximumInterestPerSecond) {
                newInterestPerSecond = maximumInterestPerSecond; // 1000% APR maximum
            }
            _accrueInfo.interestPerSecond = newInterestPerSecond.toUint64();
        }
    }

    function _accrueView() internal view override returns (Rebase memory _totalBorrow) {
        (, _totalBorrow,,,,) = _getInterestRate();
    }

    function _accrue() internal override {
        (
            ISingularity.AccrueInfo memory _accrueInfo,
            Rebase memory _totalBorrow,
            Rebase memory _totalAsset,
            uint256 extraAmount,
            uint256 feeFraction,
            uint256 utilization
        ) = _getInterestRate();

        emit LogAccrue(extraAmount, feeFraction, _accrueInfo.interestPerSecond, utilization);
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
                revert TransferFailed();
            }
        } else {
            // yieldBox.transfer(from, address(this), _assetId, share);
            bool isErr = pearlmit.transferFromERC1155(from, address(this), address(yieldBox), _assetId, share);
            if (isErr) {
                revert TransferFailed();
            }
        }
    }

    
}
