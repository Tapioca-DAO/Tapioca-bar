// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// Tapioca
import {IBigBang} from "tapioca-periph/interfaces/bar/IBigBang.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";
import {BBStorage} from "./BBStorage.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract BBCommon is BBStorage {
    using RebaseLibrary for Rebase;
    using SafeCast for uint256;
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error NotEnough();
    error TransferFailed();

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns total market debt
    function getTotalDebt() external view returns (uint256) {
        return totalBorrow.elastic;
    }

    /// @notice returns the current debt rate
    function getDebtRate() public view returns (uint256) {
        if (isMainMarket) return penrose.bigBangEthDebtRate(); // default 0.5%
        if (totalBorrow.elastic == 0) return minDebtRate;

        uint256 _ethMarketTotalDebt = IBigBang(penrose.bigBangEthMarket()).getTotalDebt();
        uint256 _currentDebt = totalBorrow.elastic;
        uint256 _maxDebtPoint = (_ethMarketTotalDebt * debtRateAgainstEthMarket) / 1e18;

        if (_currentDebt >= _maxDebtPoint) return maxDebtRate;

        uint256 debtPercentage = (_currentDebt * DEBT_PRECISION) / _maxDebtPoint;
        uint256 debt = ((maxDebtRate - minDebtRate) * debtPercentage) / DEBT_PRECISION + minDebtRate;

        if (debt > maxDebtRate) return maxDebtRate;

        return debt;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Accrues the interest on the borrowed tokens and handles the accumulation of fees.
    function accrue() external {
        _accrue();
    }

    function _accrueView() internal view override returns (Rebase memory _totalBorrow) {
        uint256 elapsedTime = block.timestamp - accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return totalBorrow;
        }

        // Calculate fees
        _totalBorrow = totalBorrow;
        uint256 extraAmount = (uint256(_totalBorrow.elastic) * (getDebtRate() / 31536000) * elapsedTime) / 1e18;
        uint256 max = type(uint128).max - totalBorrowCap;

        if (extraAmount > max) {
            extraAmount = max;
        }
        _totalBorrow.elastic += extraAmount.toUint128();
    }

    function _accrue() internal override {
        IBigBang.AccrueInfo memory _accrueInfo = accrueInfo;
        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - _accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return;
        }
        //update debt rate
        uint256 annumDebtRate = getDebtRate();
        _accrueInfo.debtRate = (annumDebtRate / 31557600).toUint64(); //per second; account for leap years
        _accrueInfo.lastAccrued = block.timestamp.toUint64();

        Rebase memory _totalBorrow = totalBorrow;

        // Calculate fees
        uint256 extraAmount = 0;
        extraAmount = (uint256(_totalBorrow.elastic) * _accrueInfo.debtRate * elapsedTime) / 1e18;

        // cap `extraAmount` to avoid overflow risk when converting it from uint256 to uint128
        uint256 max = type(uint128).max - totalBorrowCap;

        if (extraAmount > max) {
            extraAmount = max;
        }
        _totalBorrow.elastic += extraAmount.toUint128();

        totalBorrow = _totalBorrow;
        accrueInfo = _accrueInfo;

        emit LogAccrue(extraAmount, _accrueInfo.debtRate);
    }

    /// @dev Helper function to move tokens.
    /// @param from Account to debit tokens from, in `yieldBox`.
    /// @param _tokenId The ERC-20 token asset ID in yieldBox.
    /// @param share The amount in shares to add.
    /// @param total Grand total amount to deduct from this contract's balance. Only applicable if `skim` is True.
    /// Only used for accounting checks.
    /// @param skim If True, only does a balance check on this contract.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    function _addTokens(address from, uint256 _tokenId, uint256 share, uint256 total, bool skim) internal {
        if (skim) {
            require(share <= yieldBox.balanceOf(address(this), _tokenId) - total, "BB: too much");
        } else {
            // yieldBox.transfer(from, address(this), _tokenId, share);
            bool isErr = pearlmit.transferFromERC1155(from, address(this), address(yieldBox), _tokenId, share);
            if (isErr) {
                revert TransferFailed();
            }
        }
    }

    /// @notice deposits an amount to YieldBox
    /// @param token the IERC20 token to deposit
    /// @param to the shares receiver
    /// @param id the IERC20 YieldBox asset id
    /// @param amount the amount to deposit
    function _depositAmountToYb(IERC20 token, address to, uint256 id, uint256 amount)
        internal
        returns (uint256 share)
    {
        address(token).safeApprove(address(yieldBox), amount);
        (, share) = yieldBox.depositAsset(id, address(this), to, amount, 0);
    }
}
