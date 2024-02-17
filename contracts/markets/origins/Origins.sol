// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IUsdo} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";
import {Market, MarketERC20} from "../Market.sol";

// solhint-disable max-line-length

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/// @notice used for initial USDO mint
contract Origins is Ownable, Market, ReentrancyGuard {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    using SafeCast for uint256;
    using SafeApprove for address;

    // ************ //
    // *** VARS *** //
    // ************ //
    mapping(address => bool) allowedParticipants;

    error NotAuthorized();
    error TransferFailed();
    error BorrowCapReached();
    error NothingToRepay();
    error NotValid();
    error BadPair();

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when collateral is added
    event LogAddCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when collateral is removed
    event LogRemoveCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when borrow is performed
    event LogBorrow(address indexed from, address indexed to, uint256 indexed amount, uint256 part);
    /// @notice event emitted when a repay operation is performed
    event LogRepay(address indexed from, address indexed to, uint256 indexed amount, uint256 part);

    constructor(
        address _owner,
        address _yieldBox,
        IERC20 _asset,
        uint256 _assetId,
        IERC20 _collateral,
        uint256 _collateralId,
        ITapiocaOracle _oracle,
        uint256 _exchangeRatePrecision,
        uint256 _collateralizationRate
    ) MarketERC20("Origins") {
        allowedParticipants[_owner] = true;

        yieldBox = IYieldBox(_yieldBox);

        if (address(_collateral) == address(0)) revert BadPair();
        if (address(_asset) == address(0)) revert BadPair();
        if (address(_oracle) == address(0)) revert BadPair();
        if (_collateralizationRate > FEE_PRECISION) revert NotValid();

        asset = _asset;
        assetId = _assetId;
        collateral = _collateral;
        collateralId = _collateralId;
        oracle = _oracle;
        updateExchangeRate();

        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision > 0 ? _exchangeRatePrecision : 1e18;

        collateralizationRate = _collateralizationRate;

        rateValidDuration = 24 hours;

        conservator = _owner;
        _transferOwnership(_owner);
    }

    // ************************* //
    // *** OWNER FUNCTIONS ***** //
    // ************************* //
    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(PauseType _type, bool val) external {
        require(msg.sender == conservator, "Market: unauthorized");
        require(val != pauseOptions[_type], "Market: same state");
        emit PausedUpdated(_type, pauseOptions[_type], val);
        pauseOptions[_type] = val;
    }

    /// @notice updates the pause state of the contract for all types
    /// @param val the new val
    function updatePauseAll(bool val) external {
        require(msg.sender == conservator, "Market: unauthorized");

        pauseOptions[PauseType.Borrow] = val;
        pauseOptions[PauseType.Repay] = val;
        pauseOptions[PauseType.AddCollateral] = val;
        pauseOptions[PauseType.RemoveCollateral] = val;
        pauseOptions[PauseType.Liquidation] = val;
        pauseOptions[PauseType.LeverageBuy] = val;
        pauseOptions[PauseType.LeverageSell] = val;

        emit PausedUpdated(PauseType.Borrow, pauseOptions[PauseType.Borrow], val);
        emit PausedUpdated(PauseType.Repay, pauseOptions[PauseType.Repay], val);
        emit PausedUpdated(PauseType.AddCollateral, pauseOptions[PauseType.AddCollateral], val);
        emit PausedUpdated(PauseType.RemoveCollateral, pauseOptions[PauseType.RemoveCollateral], val);
        emit PausedUpdated(PauseType.Liquidation, pauseOptions[PauseType.Liquidation], val);
        emit PausedUpdated(PauseType.LeverageBuy, pauseOptions[PauseType.LeverageBuy], val);
        emit PausedUpdated(PauseType.LeverageSell, pauseOptions[PauseType.LeverageSell], val);
    }

    /// @notice rescues unused ETH from the contract
    /// @param amount the amount to rescue
    /// @param to the recipient
    function rescueEth(uint256 amount, address to) external onlyOwner {
        (bool success,) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Adds `collateral`
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param amount The amount to add for `msg.sender`.
    /// @param share The amount of shares to add for `msg.sender`.
    function addCollateral(uint256 amount, uint256 share) external optionNotPaused(PauseType.AddCollateral) {
        if (!allowedParticipants[msg.sender]) revert NotAuthorized();

        if (share == 0) {
            share = yieldBox.toShare(collateralId, amount, false);
        }

        _addCollateral(msg.sender, msg.sender, amount, share);
    }

    /// @notice Removes `share` amount of collateral
    /// @param share Amount of shares to remove.
    function removeCollateral(uint256 share)
        external
        optionNotPaused(PauseType.RemoveCollateral)
        solvent(msg.sender, false)
    {
        if (!allowedParticipants[msg.sender]) revert NotAuthorized();
        _removeCollateral(msg.sender, msg.sender, share);
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @param amount Amount to borrow.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(uint256 amount)
        external
        optionNotPaused(PauseType.Borrow)
        solvent(msg.sender, false)
        returns (uint256 part, uint256 share)
    {
        if (!allowedParticipants[msg.sender]) revert NotAuthorized();

        if (amount == 0) return (0, 0);
        (part, share) = _borrow(msg.sender, msg.sender, amount);
    }

    /// @notice Repays a loan.
    /// @dev The bool param is not used but we added it to respect the ISingularity interface for MarketsHelper compatibility
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(uint256 part) external optionNotPaused(PauseType.Repay) returns (uint256 amount) {
        if (!allowedParticipants[msg.sender]) revert NotAuthorized();

        updateExchangeRate();
        amount = _repay(msg.sender, msg.sender, part);
    }

    function _accrue() internal pure override {
        // does nothign on this market
    }

    function _accrueView() internal pure override returns (Rebase memory) {
        // does nothign on this market
        Rebase memory rb = Rebase({elastic: 0, base: 0});
        return rb;
    }

    receive() external payable {}

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _repay(address from, address to, uint256 part) internal returns (uint256 amountOut) {
        if (part > userBorrowPart[to]) {
            part = userBorrowPart[to];
        }
        if (part == 0) revert NothingToRepay();

        uint256 amount;
        (totalBorrow, amount) = totalBorrow.sub(part, true);
        userBorrowPart[to] -= part;

        // amount includes the opening & accrued fees
        amountOut = amount;
        yieldBox.withdraw(assetId, from, address(this), amount, 0);

        //burn USDO
        IUsdo(address(asset)).burn(address(this), amount);

        emit LogRepay(from, to, amountOut, part);
    }

    function _borrow(address from, address to, uint256 amount) internal returns (uint256 part, uint256 share) {
        (totalBorrow, part) = totalBorrow.add(amount, true);

        if (totalBorrowCap > 0) {
            if (totalBorrow.elastic > totalBorrowCap) revert BorrowCapReached();
        }

        userBorrowPart[from] += part;
        emit LogBorrow(from, to, amount, part);

        //mint USDO
        IUsdo(address(asset)).mint(address(this), amount);

        //deposit borrowed amount to user
        share = _depositAmountToYb(asset, to, assetId, amount);
    }

    function _depositAmountToYb(IERC20 token, address to, uint256 id, uint256 amount)
        internal
        returns (uint256 share)
    {
        address(token).safeApprove(address(yieldBox), amount);
        (, share) = yieldBox.depositAsset(id, address(this), to, amount, 0);
    }

    function _addCollateral(address from, address to, uint256 amount, uint256 share) internal {
        if (share == 0) {
            share = yieldBox.toShare(collateralId, amount, false);
        }
        userCollateralShare[to] += share;
        uint256 oldTotalCollateralShare = totalCollateralShare;
        totalCollateralShare = oldTotalCollateralShare + share;
        yieldBox.transfer(from, address(this), collateralId, share);
        emit LogAddCollateral(from, to, share);
    }

    function _removeCollateral(address from, address to, uint256 share) internal {
        userCollateralShare[from] -= share;
        totalCollateralShare -= share;
        emit LogRemoveCollateral(from, to, share);
        yieldBox.transfer(address(this), to, collateralId, share);
    }
}
