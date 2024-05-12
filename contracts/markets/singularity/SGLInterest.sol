// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {SGLStorage} from "./SGLStorage.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGLInterest is SGLStorage {
    using RebaseLibrary for Rebase;
    using SafeCast for uint256;

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _getInterestRate()
        public
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
}
