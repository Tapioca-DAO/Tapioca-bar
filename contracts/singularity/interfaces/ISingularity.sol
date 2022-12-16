// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './IOracle.sol';
import '../../IPenrose.sol';
import '../../swappers/IMultiSwapper.sol';

interface ISingularity {
    struct AccrueInfo {
        uint64 interestPerSecond;
        uint64 lastAccrued;
        uint128 feesEarnedFraction;
    }

    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value
    );
    event LogAccrue(
        uint256 accruedAmount,
        uint256 feeFraction,
        uint64 rate,
        uint256 utilization
    );
    event LogAddAsset(
        address indexed from,
        address indexed to,
        uint256 share,
        uint256 fraction
    );
    event LogAddCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    event LogBorrow(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 feeAmount,
        uint256 part
    );
    event LogExchangeRate(uint256 rate);
    event LogFeeTo(address indexed newFeeTo);
    event LogRemoveAsset(
        address indexed from,
        address indexed to,
        uint256 share,
        uint256 fraction
    );
    event LogRemoveCollateral(
        address indexed from,
        address indexed to,
        uint256 share
    );
    event LogRepay(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 part
    );
    event LogWithdrawFees(address indexed feeTo, uint256 feesEarnedFraction);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event LogFlashLoan(
        address indexed borrower,
        uint256 amount,
        uint256 feeAmount,
        address indexed receiver
    );
    event LogYieldBoxFeesDeposit(uint256 feeShares, uint256 tapAmount);
    event LogApprovalForAll(
        address indexed _from,
        address indexed _operator,
        bool _approved
    );
    error NotApproved(address _from, address _operator);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function accrue() external;

    function accrueInfo()
        external
        view
        returns (
            uint64 interestPerSecond,
            uint64 lastBlockAccrued,
            uint128 feesEarnedFraction
        );

    function setApprovalForAll(address operator, bool approved) external;

    function addAsset(
        address from,
        address to,
        bool skim,
        uint256 share
    ) external returns (uint256 fraction);

    function addCollateral(
        address from,
        address to,
        bool skim,
        uint256 share
    ) external;

    function allowance(address, address) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function asset() external view returns (address);

    function assetId() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function penrose() external view returns (address);

    function borrow(
        address from,
        address to,
        uint256 amount
    ) external returns (uint256 part, uint256 share);

    function claimOwnership() external;

    function collateral() external view returns (address);

    function collateralId() external view returns (uint256);

    /// @notice Allows batched call to Singularity.
    /// @param calls An array encoded call data.
    /// @param revertOnFail If True then reverts after a failed call and stops doing further calls.
    function execute(bytes[] calldata calls, bool revertOnFail)
        external
        returns (bool[] memory successes, string[] memory results);

    function decimals() external view returns (uint8);

    function exchangeRate() external view returns (uint256);

    function feeTo() external view returns (address);

    function getInitData(
        address collateral_,
        address asset_,
        IOracle oracle_,
        bytes calldata oracleData_
    ) external pure returns (bytes memory data);

    function init(bytes calldata data) external payable;

    function isSolvent(address user, bool open) external view returns (bool);

    function liquidate(
        address[] calldata users,
        uint256[] calldata borrowParts,
        address to,
        IMultiSwapper swapper,
        bool open
    ) external;

    function masterContract() external view returns (address);

    function name() external view returns (string memory);

    function nonces(address) external view returns (uint256);

    function oracle() external view returns (IOracle);

    function oracleData() external view returns (bytes memory);

    function owner() external view returns (address);

    function pendingOwner() external view returns (address);

    function permit(
        address owner_,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function removeAsset(
        address from,
        address to,
        uint256 fraction
    ) external returns (uint256 share);

    function removeCollateral(
        address from,
        address to,
        uint256 share
    ) external;

    function repay(
        address from,
        address to,
        bool skim,
        uint256 part
    ) external returns (uint256 amount);

    function setFeeTo(address newFeeTo) external;

    function setSwapper(IMultiSwapper swapper, bool enable) external;

    function swappers(IMultiSwapper) external view returns (bool);

    function symbol() external view returns (string memory);

    function totalAsset() external view returns (uint128 elastic, uint128 base);

    function totalBorrow()
        external
        view
        returns (uint128 elastic, uint128 base);

    function callerFee() external view returns (uint256);

    function protocolFee() external view returns (uint256);

    function borrowOpeningFee() external view returns (uint256);

    function flashloanFee() external view returns (uint256);

    function liquidationMultiplier() external view returns (uint256);

    function orderBookLiquidationMultiplier() external view returns (uint256);

    function closedCollateralizationRate() external view returns (uint256);

    function lqCollateralizationRate() external view returns (uint256);

    function totalCollateralShare() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transferOwnership(
        address newOwner,
        bool direct,
        bool renounce
    ) external;

    function updateExchangeRate() external returns (bool updated, uint256 rate);

    function userBorrowPart(address) external view returns (uint256);

    function userCollateralShare(address) external view returns (uint256);

    function withdrawFees() external;

    function depositFeesToYieldBox(IMultiSwapper, IPenrose.SwapData calldata)
        external;

    function yieldBox() external view returns (address payable);

    function liquidationQueue() external view returns (address payable);

    function withdrawTo(
        uint16 dstChainId,
        bytes memory receiver,
        uint256 amount,
        bytes calldata adapterParams,
        address payable refundAddress
    ) external payable;
}
