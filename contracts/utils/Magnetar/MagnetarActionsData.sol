// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "../../interfaces/ISendFrom.sol";
import "../../singularity/interfaces/ISingularity.sol";

abstract contract MagnetarActionsData {
    // GENERIC
    struct PermitData {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct PermitAllData {
        address owner;
        address spender;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // TOFT
    struct WrapData {
        address from;
        address to;
        uint256 amount;
    }

    struct WrapNativeData {
        address to;
    }

    struct TOFTSendAndBorrowData {
        address from;
        address to;
        uint16 lzDstChainId;
        bytes airdropAdapterParams;
        ITOFTOperations.IBorrowParams borrowParams;
        ITOFTOperations.IWithdrawParams withdrawParams;
        ITOFTOperations.ITOFTSendOptions options;
        ITOFTOperations.ITOFTApproval[] approvals;
    }

    struct TOFTSendAndLendData {
        address from;
        address to;
        uint16 lzDstChainId;
        ITOFTOperations.ILendParams lendParams;
        ITOFTOperations.IUSDOSendOptions options;
        ITOFTOperations.IUSDOApproval[] approvals;
    }

    struct TOFTSendToYBData {
        address from;
        address to;
        uint256 amount;
        uint256 assetId;
        uint16 lzDstChainId;
        ITOFTOperations.ITOFTSendOptions options;
    }
    struct USDOSendToYBData {
        address from;
        address to;
        uint256 amount;
        uint256 assetId;
        uint16 lzDstChainId;
        ITOFTOperations.IUSDOSendOptions options;
    }

    // YieldBox
    struct YieldBoxDepositData {
        uint256 assetId;
        address from;
        address to;
        uint256 amount;
        uint256 share;
    }

    // Singularity
    struct SGLAddCollateralData {
        address from;
        address to;
        bool skim;
        uint256 share;
    }

    struct SGLBorrowData {
        address from;
        address to;
        uint256 amount;
    }

    struct SGLLendData {
        address from;
        address to;
        bool skim;
        uint256 share;
    }

    struct SGLRepayData {
        address from;
        address to;
        bool skim;
        uint256 part;
    }

    struct HelperLendData {
        address market;
        address from;
        uint256 amount;
        bool deposit;
        bool extractFromSender;
    }

    struct HelperBorrowData {
        address market;
        address user;
        uint256 collateralAmount;
        uint256 borrowAmount;
        bool extractFromSender;
        bool deposit;
        bool withdraw;
        bytes withdrawData;
    }
}

interface IPermit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

interface IPermitAll {
    function permitAll(
        address owner,
        address spender,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

interface IHelperOperations {
    function depositAddCollateralAndBorrow(
        IMarket market,
        address _user,
        uint256 _collateralAmount,
        uint256 _borrowAmount,
        bool extractFromSender,
        bool deposit_,
        bool withdraw_,
        bytes calldata _withdrawData
    ) external payable;

    function depositAndAddAsset(
        ISingularity singularity,
        address _user,
        uint256 _amount,
        bool deposit_,
        bool extractFromSender
    ) external;
}

interface ITOFTOperations {
    // Structs
    struct ITOFTSendOptions {
        uint256 extraGasLimit;
        address zroPaymentAddress;
        bool strategyDeposit;
        bool wrap;
    }
    struct IUSDOSendOptions {
        uint256 extraGasLimit;
        address zroPaymentAddress;
        bool strategyDeposit;
    }
    struct ITOFTApproval {
        bool allowFailure;
        address target;
        bool permitBorrow;
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    struct IUSDOApproval {
        bool allowFailure;
        address target;
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    struct IWithdrawParams {
        uint256 withdrawLzFeeAmount;
        bool withdrawOnOtherChain;
        uint16 withdrawLzChainId;
        bytes withdrawAdapterParams;
    }
    struct IBorrowParams {
        uint256 amount;
        uint256 borrowAmount;
        address marketHelper;
        address market;
    }
    struct ILendParams {
        uint256 amount;
        address marketHelper;
        address market;
    }

    // Functions
    function wrap(
        address fromAddress,
        address toAddress,
        uint256 amount
    ) external;

    function wrapNative(address _toAddress) external payable;

    function sendToYBAndBorrow(
        address _from,
        address _to,
        uint16 lzDstChainId,
        bytes calldata airdropAdapterParams,
        IBorrowParams calldata borrowParams,
        IWithdrawParams calldata withdrawParams,
        ITOFTSendOptions calldata options,
        ITOFTApproval[] calldata approvals
    ) external payable;

    function sendToYBAndLend(
        address _from,
        address _to,
        uint16 lzDstChainId,
        ILendParams calldata lendParams,
        IUSDOSendOptions calldata options,
        IUSDOApproval[] calldata approvals
    ) external payable;

    function sendToYB(
        address from,
        address to,
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        ITOFTSendOptions calldata options
    ) external payable;

    function sendToYB(
        address from,
        address to,
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        IUSDOSendOptions calldata options
    ) external payable;

    function retrieveFromYB(
        address from,
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        bytes memory airdropAdapterParam,
        bool strategyWithdrawal
    ) external payable;

    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes32 _toAddress,
        uint256 _amount,
        ISendFrom.LzCallParams calldata _callParams
    ) external payable;
}

interface IDepositAsset {
    function depositAsset(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external returns (uint256 amountOut, uint256 shareOut);
}

interface ISingularityOperations {
    function addCollateral(
        address from,
        address to,
        bool skim,
        uint256 share
    ) external;

    function borrow(
        address from,
        address to,
        uint256 amount
    ) external returns (uint256 part, uint256 share);

    function withdrawTo(
        address from,
        uint16 dstChainId,
        bytes32 receiver,
        uint256 amount,
        bytes calldata adapterParams,
        address payable refundAddress
    ) external payable;

    function addAsset(
        address from,
        address to,
        bool skim,
        uint256 share
    ) external returns (uint256 fraction);

    function repay(
        address from,
        address to,
        bool skim,
        uint256 part
    ) external returns (uint256 amount);
}
