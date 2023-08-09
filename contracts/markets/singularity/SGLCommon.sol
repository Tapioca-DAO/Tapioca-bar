// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLStorage.sol";

contract SGLCommon is SGLStorage {
    using RebaseLibrary for Rebase;

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
        returns (
            ISingularity.AccrueInfo memory _accrueInfo,
            uint256 utilization
        )
    {
        (_accrueInfo, , , , , utilization, ) = _getInterestRate();
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

        uint256 fullAssetAmount = yieldBox.toAmount(
            assetId,
            _totalAsset.elastic,
            false
        ) + _totalBorrow.elastic;

        utilization = fullAssetAmount == 0
            ? 0
            : (uint256(_totalBorrow.elastic) * UTILIZATION_PRECISION) /
                fullAssetAmount;

        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - _accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return (
                _accrueInfo,
                totalBorrow,
                totalAsset,
                0,
                0,
                utilization,
                logStartingInterest
            );
        }
        _accrueInfo.lastAccrued = uint64(block.timestamp);

        if (_totalBorrow.base == 0) {
            // If there are no borrows, reset the interest rate
            if (_accrueInfo.interestPerSecond != startingInterestPerSecond) {
                _accrueInfo.interestPerSecond = startingInterestPerSecond;
                logStartingInterest = true;
            }
            return (
                _accrueInfo,
                _totalBorrow,
                totalAsset,
                0,
                0,
                utilization,
                logStartingInterest
            );
        }

        // Accrue interest
        extraAmount =
            (uint256(_totalBorrow.elastic) *
                _accrueInfo.interestPerSecond *
                elapsedTime) /
            1e18;
        _totalBorrow.elastic += uint128(extraAmount);

        uint256 feeAmount = (extraAmount * protocolFee) / FEE_PRECISION; // % of interest paid goes to fee
        feeFraction = (feeAmount * _totalAsset.base) / fullAssetAmount;
        _accrueInfo.feesEarnedFraction += uint128(feeFraction);
        _totalAsset.base = _totalAsset.base + uint128(feeFraction);

        // Update interest rate
        if (utilization < minimumTargetUtilization) {
            uint256 underFactor = ((minimumTargetUtilization - utilization) *
                FACTOR_PRECISION) / minimumTargetUtilization;
            uint256 scale = interestElasticity +
                (underFactor * underFactor * elapsedTime);
            _accrueInfo.interestPerSecond = uint64(
                (uint256(_accrueInfo.interestPerSecond) * interestElasticity) /
                    scale
            );
            if (_accrueInfo.interestPerSecond < minimumInterestPerSecond) {
                _accrueInfo.interestPerSecond = minimumInterestPerSecond; // 0.25% APR minimum
            }
        } else if (utilization > maximumTargetUtilization) {
            uint256 overFactor = ((utilization - maximumTargetUtilization) *
                FACTOR_PRECISION) / fullUtilizationMinusMax;
            uint256 scale = interestElasticity +
                (overFactor * overFactor * elapsedTime);
            uint256 newInterestPerSecond = (uint256(
                _accrueInfo.interestPerSecond
            ) * scale) / interestElasticity;
            if (newInterestPerSecond > maximumInterestPerSecond) {
                newInterestPerSecond = maximumInterestPerSecond; // 1000% APR maximum
            }
            _accrueInfo.interestPerSecond = uint64(newInterestPerSecond);
        }
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
            emit LogAccrue(
                extraAmount,
                feeFraction,
                _accrueInfo.interestPerSecond,
                utilization
            );
        }
        accrueInfo = _accrueInfo;
        totalBorrow = _totalBorrow;
        totalAsset = _totalAsset;
    }

    /// @dev Helper function to move tokens.
    /// @param from Account to debit tokens from, in `yieldBox`.
    /// @param to The user that receives the tokens.
    /// @param _assetId The ERC-20 token asset ID in yieldBox.
    /// @param share The amount in shares to add.
    /// @param total Grand total amount to deduct from this contract's balance. Only applicable if `skim` is True.
    /// Only used for accounting checks.
    /// @param skim If True, only does a balance check on this contract.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    function _addTokens(
        address from,
        address to,
        uint256 _assetId,
        uint256 share,
        uint256 total,
        bool skim
    ) internal {
        if (skim) {
            require(
                share <= yieldBox.balanceOf(address(this), _assetId) - total,
                "SGL: too much"
            );
        } else {
            yieldBox.transfer(from, address(this), _assetId, share);
        }
    }

    /// @dev Concrete implementation of `addAsset`.
    function _addAsset(
        address from,
        address to,
        bool skim,
        uint256 share
    ) internal returns (uint256 fraction) {
        Rebase memory _totalAsset = totalAsset;
        uint256 totalAssetShare = _totalAsset.elastic;
        uint256 allShare = _totalAsset.elastic +
            yieldBox.toShare(assetId, totalBorrow.elastic, true);
        fraction = allShare == 0
            ? share
            : (share * _totalAsset.base) / allShare;
        if (_totalAsset.base + uint128(fraction) < 1000) {
            return 0;
        }
        totalAsset = _totalAsset.add(share, fraction);
        balanceOf[to] += fraction;
        emit Transfer(address(0), to, fraction);

        _addTokens(from, to, assetId, share, totalAssetShare, skim);
        _yieldBoxShares[to][ASSET_SIG] += share;
        emit LogAddAsset(skim ? address(yieldBox) : from, to, share, fraction);
    }

    /// @dev Concrete implementation of `removeAsset`.
    /// @param from The account to remove from. Should always be msg.sender except for `depositFeesToyieldBox()`.
    function _removeAsset(
        address from,
        address to,
        uint256 fraction,
        bool updateYieldBoxShares
    ) internal returns (uint256 share) {
        if (totalAsset.base == 0) {
            return 0;
        }
        Rebase memory _totalAsset = totalAsset;
        uint256 allShare = _totalAsset.elastic +
            yieldBox.toShare(assetId, totalBorrow.elastic, true);
        share = (fraction * allShare) / _totalAsset.base;
        balanceOf[from] -= fraction;
        emit Transfer(from, address(0), fraction);
        _totalAsset.elastic -= uint128(share);
        _totalAsset.base -= uint128(fraction);
        require(_totalAsset.base >= 1000, "SGL: min limit");
        totalAsset = _totalAsset;
        emit LogRemoveAsset(from, to, share, fraction);
        yieldBox.transfer(address(this), to, assetId, share);
        if (updateYieldBoxShares) {
            if (share > _yieldBoxShares[from][ASSET_SIG]) {
                _yieldBoxShares[from][ASSET_SIG] = 0; //some assets accrue in time
            } else {
                _yieldBoxShares[from][ASSET_SIG] -= share;
            }
        }
    }

    /// @dev Return the equivalent of collateral borrow part in asset amount.
    function _getAmountForBorrowPart(
        uint256 borrowPart
    ) internal view returns (uint256) {
        return totalBorrow.toElastic(borrowPart, false);
    }
}
