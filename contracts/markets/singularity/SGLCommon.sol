// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {ISGLInterestHelper} from "tapioca-periph/interfaces/bar/ISGLInterestHelper.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
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
        (_accrueInfo, _totalBorrow, _totalAsset, extraAmount, feeFraction, utilization) = ISGLInterestHelper(
            interestHelper
        ).getInterestRate(
            ISGLInterestHelper.InterestRateCall(
                yieldBox,
                accrueInfo,
                assetId,
                totalAsset,
                totalBorrow,
                protocolFee,
                interestElasticity,
                minimumTargetUtilization,
                maximumTargetUtilization,
                minimumInterestPerSecond,
                maximumInterestPerSecond,
                startingInterestPerSecond
            )
        );
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
