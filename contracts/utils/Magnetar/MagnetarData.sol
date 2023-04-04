// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "../../interfaces/ISendFrom.sol";

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

interface ITOFTOperations {
    function wrap(
        address _fromAddress,
        address _toAddress,
        uint256 _amount
    ) external;

    function wrapNative(address _toAddress) external payable;

    struct SendOptions {
        uint256 extraGasLimit;
        address zroPaymentAddress;
        bool strategyDeposit;
        bool wrap;
    }

    struct IApproval {
        address target;
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function sendApproval(
        uint16 lzDstChainId,
        IApproval calldata approval,
        SendOptions calldata options
    ) external payable;

    function sendToYBAndBorrow(
        address _from,
        address _to,
        uint256 amount,
        uint256 borrowAmount,
        address _marketHelper,
        address _market,
        uint16 lzDstChainId,
        uint256 withdrawLzFeeAmount,
        SendOptions calldata options
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

contract MagnetarData {
    // ************ //
    // *** VARS *** //
    // ************ //

    //TODO: decide on uint size after all operations
    uint32 internal constant PERMIT_ALL = 1;
    uint32 internal constant PERMIT = 2;
    uint32 internal constant YB_DEPOSIT_ASSET = 3;
    uint32 internal constant SGL_ADD_COLLATERAL = 4;
    uint32 internal constant SGL_BORROW = 5;
    uint32 internal constant SGL_WITHDRAW_TO = 6;
    uint32 internal constant SGL_LEND = 7;
    uint32 internal constant SGL_REPAY = 8;
    uint32 internal constant TOFT_WRAP = 9;
    uint32 internal constant TOFT_SEND_FROM = 10;
    uint32 internal constant TOFT_SEND_APPROVAL = 11;
    uint32 internal constant TOFT_SEND_AND_BORROW = 12;

    struct Result {
        bool success;
        bytes returnData;
    }

    struct PermitData {
        address target;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
        bool isPermitAll;
    }

    struct WrapData {
        address target;
        address to;
        uint256 value;
        bool isNative;
    }

    struct SendApprovalData {
        address target;
        uint256 value;
        uint16 lzDstChainId;
        ITOFTOperations.IApproval approval;
        ITOFTOperations.SendOptions sendOptions;
    }

    struct TOFTSendAndBorrowData {
        address target;
        uint256 value;
        address to;
        uint256 amount;
        uint256 borrowAmount;
        address marketHelper;
        address market;
        uint16 lzDstChainId;
        uint256 withdrawLzFeeAmount;
        ITOFTOperations.SendOptions sendOptions;
    }

    struct SendFromData {
        address target;
        bytes32 to;
        uint16 dstChainId;
        uint256 amount;
        ISendFrom.LzCallParams callParams;
        uint256 value;
    }

    struct YieldBoxDepositData {
        address target;
        address to;
        uint256 amount;
        uint256 share;
        uint256 assetId;
    }

    struct SGLAddCollateralData {
        address target;
        address to;
        bool skim;
        uint256 share;
    }

    struct SGLBorrowData {
        address target;
        address to;
        uint256 amount;
    }

    struct SGLWithdrawToData {
        address target;
        uint16 dstChainId;
        bytes32 receiver;
        uint256 amount;
        bytes adapterParams;
        address payable refundAddress;
    }

    struct SGLLendData {
        address target;
        address to;
        bool skim;
        uint256 share;
    }

    struct SGLRepayData {
        address target;
        address to;
        bool skim;
        uint256 part;
    }
}
