// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

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

interface IWrap {
    function wrap(
        address _fromAddress,
        address _toAddress,
        uint256 _amount
    ) external;

    function wrapNative(address _toAddress) external payable;
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
}

contract MagnetarData {
    // ************ //
    // *** VARS *** //
    // ************ //

    //TODO: decide on uint size after all operations
    uint32 internal constant PERMIT_ALL = 1;
    uint32 internal constant PERMIT = 2;
    uint32 internal constant TOFT_WRAP = 5;
    uint32 internal constant TOFT_SEND_FROM = 6;
    uint32 internal constant YB_DEPOSIT_ASSET = 7;
    uint32 internal constant SGL_ADD_COLLATERAL = 8;
    uint32 internal constant SGL_BORROW = 9;
    uint32 internal constant SGL_WITHDRAW_TO = 10;

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

    struct SendFromData {
        address target;
        bytes32 to;
        uint16 dstChainId;
        uint256 amount;
        ISendFrom.LzCallParams callParams;
        uint256 value;
    }

    struct YieldBoxDeposit {
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

    struct SGLWithdrawTo {
        address target;
        uint16 dstChainId;
        bytes32 receiver;
        uint256 amount;
        bytes adapterParams;
        address payable refundAddress;
    }

    //TODO: check if needed; probably not
    struct Call {
        address target;
        bool allowFailure;
        bytes callData;
    }

    //TODO: check if needed; probably not
    struct CallWithValue {
        address target;
        bool allowFailure;
        uint256 value;
        bytes callData;
    }
}
