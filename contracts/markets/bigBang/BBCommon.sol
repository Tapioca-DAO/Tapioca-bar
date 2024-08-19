// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// Tapioca
import {IBigBangDebtRateHelper} from "tapioca-periph/interfaces/bar/IBigBangDebtRateHelper.sol";
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
    error AccruePaused();
    error OracleCallFailed();

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns total market debt
    function getTotalDebt() external view returns (uint256) {
        return totalBorrow.elastic;
    }

    /// @notice returns the current debt rate
    function getDebtRate() public view returns (uint256) {
        return IBigBangDebtRateHelper(debtRateHelper).getDebtRate(IBigBangDebtRateHelper.DebtRateCall({
            isMainMarket: isMainMarket,
            penrose: penrose,
            elastic: totalBorrow.elastic,
            debtRateAgainstEthMarket: debtRateAgainstEthMarket,
            maxDebtRate: maxDebtRate,
            minDebtRate: minDebtRate
        }));
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Accrues the interest on the borrowed tokens and handles the accumulation of fees.
    function accrue() external {
        if (pauseOptions[PauseType.AddCollateral] || pauseOptions[PauseType.RemoveCollateral]) revert AccruePaused();
        _accrue();
    }

    function _accrueView() internal view override returns (Rebase memory _totalBorrow) {
        uint256 elapsedTime = block.timestamp - accrueInfo.lastAccrued;
        if (elapsedTime == 0) {
            return totalBorrow;
        }

        // Calculate fees
        _totalBorrow = totalBorrow;
        uint256 extraAmount = (uint256(_totalBorrow.elastic) * (getDebtRate() / 31557600) * elapsedTime) / 1e18;
        uint256 max = type(uint128).max - totalBorrow.elastic;

        if (extraAmount > max) {
            extraAmount = max;
        }
        _totalBorrow.elastic += extraAmount.toUint128();
    }

    function _accrue() internal override {
        // accrue ETH market first
        {
            address ethMarket = penrose.bigBangEthMarket();
            if (ethMarket != address(this) && ethMarket != address(0)) {
                IBigBang(ethMarket).accrue();
            }
        }

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
        uint256 max = type(uint128).max - totalBorrow.elastic;

        if (extraAmount > max) {
            extraAmount = max;
        }
        _totalBorrow.elastic += extraAmount.toUint128();
        openInterestDebt += extraAmount;

        totalBorrow = _totalBorrow;
        accrueInfo = _accrueInfo;

        emit LogAccrue(extraAmount, _accrueInfo.debtRate);
    }
    
    function _computeVariableOpeningFee(uint256 amount) internal returns (uint256) {
        //get asset <> USDC price ( USDO <> USDC )
        (bool updated, uint256 _exchangeRate) = assetOracle.get(oracleData);
        if (!updated) revert OracleCallFailed();
        return _computeVariableOpeningFeeView(amount, _exchangeRate);
    }

    function _computeVariableOpeningFeeView(uint256 amount, uint256 _exchangeRate) internal view returns (uint256) {
        if (amount == 0) return 0;

        uint256 fee;
        if (_exchangeRate >= minMintFeeStart) {
            fee = minMintFee;
        } else if (_exchangeRate <= maxMintFeeStart) {
            fee = maxMintFee;
        } else {
            // @dev default value for `maxMintFee` is > 0
            fee = maxMintFee
            - (((_exchangeRate - maxMintFeeStart) * (maxMintFee - minMintFee)) / (minMintFeeStart - maxMintFeeStart));

            if (fee > maxMintFee) {
                fee = maxMintFee;
            } else if (fee < minMintFee) {
                fee = minMintFee;
            }

        }

        // @dev if > 0, compute the fee
        return fee == 0 ? 0 : (amount * fee) / FEE_PRECISION;
    }

    /// @dev Helper function to move tokens.xc
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
        address(token).safeApprove(address(yieldBox), 0);
    }
}
