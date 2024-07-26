// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {ISGLInterestHelper} from "tap-utils/interfaces/bar/ISGLInterestHelper.sol";
import {ISingularity} from "tap-utils/interfaces/bar/ISingularity.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SGLInterestHelper is ISGLInterestHelper {
    using RebaseLibrary for Rebase;
    using SafeCast for uint256;

    uint256 private constant FULL_UTILIZATION = 1e18;
    uint256 private constant UTILIZATION_PRECISION = 1e18;
    uint256 private constant FEE_PRECISION = 1e5;

    function getInterestRate(InterestRateCall memory data)
        external
        view
        override
        returns (
            ISingularity.AccrueInfo memory _accrueInfo,
            Rebase memory _totalBorrow,
            Rebase memory _totalAsset,
            uint256 extraAmount,
            uint256 feeFraction,
            uint256 utilization
        )
    {
        _accrueInfo = data.accrueInfo;
        _totalBorrow = data.totalBorrow;
        _totalAsset = data.totalAsset;
        extraAmount = 0;
        feeFraction = 0;

        uint256 fullAssetAmount =
            data.yieldBox.toAmount(data.assetId, _totalAsset.elastic, false) + _totalBorrow.elastic;

        utilization =
            fullAssetAmount == 0 ? 0 : (uint256(_totalBorrow.elastic) * UTILIZATION_PRECISION) / fullAssetAmount;

        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - _accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return (_accrueInfo, data.totalBorrow, data.totalAsset, 0, 0, utilization);
        }
        _accrueInfo.lastAccrued = block.timestamp.toUint64();

        if (_totalBorrow.base == 0) {
            // If there are no borrows, reset the interest rate
            if (_accrueInfo.interestPerSecond != data.startingInterestPerSecond) {
                _accrueInfo.interestPerSecond = data.startingInterestPerSecond;
            }
            return (_accrueInfo, _totalBorrow, data.totalAsset, 0, 0, utilization);
        }

        // Accrue interest
        extraAmount = (uint256(_totalBorrow.elastic) * _accrueInfo.interestPerSecond * elapsedTime) / 1e18;
        _totalBorrow.elastic += extraAmount.toUint128();

        //take accrued values into account
        fullAssetAmount = data.yieldBox.toAmount(data.assetId, _totalAsset.elastic, false) + _totalBorrow.elastic;

        uint256 feeAmount = (extraAmount * data.protocolFee) / FEE_PRECISION; // % of interest paid goes to fee
        feeFraction = (feeAmount * _totalAsset.base) / (fullAssetAmount - feeAmount);
        _accrueInfo.feesEarnedFraction += feeFraction.toUint128();
        _totalAsset.base = _totalAsset.base + feeFraction.toUint128();

        utilization =
            fullAssetAmount == 0 ? 0 : (uint256(_totalBorrow.elastic) * UTILIZATION_PRECISION) / fullAssetAmount;

        // Update interest rate
        if (utilization < data.minimumTargetUtilization) {
            uint256 underFactor = ((data.minimumTargetUtilization - utilization) * 1e18) / data.minimumTargetUtilization;
            uint256 scale = data.interestElasticity + (underFactor * underFactor * elapsedTime);
            _accrueInfo.interestPerSecond =
                ((uint256(_accrueInfo.interestPerSecond) * data.interestElasticity) / scale).toUint64();
            if (_accrueInfo.interestPerSecond < data.minimumInterestPerSecond) {
                _accrueInfo.interestPerSecond = data.minimumInterestPerSecond; // 0.25% APR minimum
            }
        } else if (utilization > data.maximumTargetUtilization) {
            uint256 overFactor = ((utilization - data.maximumTargetUtilization) * 1e18)
                / (FULL_UTILIZATION - data.maximumTargetUtilization);
            uint256 scale = data.interestElasticity + (overFactor * overFactor * elapsedTime);
            uint256 newInterestPerSecond = (uint256(_accrueInfo.interestPerSecond) * scale) / data.interestElasticity;
            if (newInterestPerSecond > data.maximumInterestPerSecond) {
                newInterestPerSecond = data.maximumInterestPerSecond; // 1000% APR maximum
            }
            _accrueInfo.interestPerSecond = newInterestPerSecond.toUint64();
        }
    }
}
