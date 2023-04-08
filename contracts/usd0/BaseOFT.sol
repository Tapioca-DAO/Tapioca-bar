// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {BaseBoringBatchable} from "@boringcrypto/boring-solidity/contracts/BoringBatchable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";
import "tapioca-sdk/dist/contracts/token/oft/v2/OFTV2.sol";
import "./interfaces/IYieldBox.sol";
import "./interfaces/IMarketHelper.sol";

//
//                 .(%%%%%%%%%%%%*       *
//             #%%%%%%%%%%%%%%%%%%%%*  ####*
//          #%%%%%%%%%%%%%%%%%%%%%#  /####
//       ,%%%%%%%%%%%%%%%%%%%%%%%   ####.  %
//                                #####
//                              #####
//   #####%#####              *####*  ####%#####*
//  (#########(              #####     ##########.
//  ##########             #####.      .##########
//                       ,####/
//                      #####
//  %%%%%%%%%%        (####.           *%%%%%%%%%#
//  .%%%%%%%%%%     *####(            .%%%%%%%%%%
//   *%%%%%%%%%%   #####             #%%%%%%%%%%
//               (####.
//      ,((((  ,####(          /(((((((((((((
//        *,  #####  ,(((((((((((((((((((((
//          (####   ((((((((((((((((((((/
//         ####*  (((((((((((((((((((
//                     ,**//*,.

abstract contract BaseOFT is OFTV2, ERC20Permit, BaseBoringBatchable {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;

    /// @notice The YieldBox address.
    IYieldBox public immutable yieldBox;

    uint16 public constant PT_YB_SEND_STRAT = 770;
    uint16 public constant PT_YB_RETRIEVE_STRAT = 771;
    uint16 public constant PT_YB_DEPOSIT = 772;
    uint16 public constant PT_YB_WITHDRAW = 773;
    uint16 public constant PT_YB_SEND_SGL_LEND = 774;

    struct SendOptions {
        uint256 extraGasLimit;
        address zroPaymentAddress;
        bool strategyDeposit;
    }
    struct IApproval {
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

    struct ILendParams {
        uint256 amount;
        address marketHelper;
        address market;
    }

    /// ==========================
    /// ========== Errors ========
    /// ==========================
    /// @notice Error while depositing ETH assets to YieldBox.
    error TOFT_YB_ETHDeposit();

    /// ==========================
    /// ========== Events ========
    /// ==========================
    event YieldBoxDeposit(uint256 _amount);
    event YieldBoxRetrieval(uint256 _amount);
    event Lend(address indexed _from, uint256 _amount);
    event SendApproval(
        address _target,
        address _owner,
        address _spender,
        uint256 _amount
    );

    constructor(IYieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    receive() external payable {}

    // ==========================
    // ========== LZ ============
    // ==========================

    function sendToYB(
        address _from,
        address _to,
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        SendOptions calldata options
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(_to);
        _debitFrom(_from, lzEndpoint.getChainId(), toAddress, amount);

        bytes memory lzPayload = abi.encode(
            options.strategyDeposit ? PT_YB_SEND_STRAT : PT_YB_DEPOSIT,
            LzLib.addressToBytes32(_from),
            toAddress,
            amount,
            assetId
        );

        bytes memory adapterParam = LzLib.buildDefaultAdapterParams(
            options.extraGasLimit
        );
        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(_from),
            options.zroPaymentAddress,
            adapterParam,
            msg.value
        );

        emit SendToChain(lzDstChainId, _from, toAddress, amount);
    }

    function sendToYBAndLend(
        address _from,
        address _to,
        uint16 lzDstChainId,
        ILendParams calldata lendParams,
        SendOptions calldata options,
        IApproval[] calldata approvals
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(_to);
        _debitFrom(
            _from,
            lzEndpoint.getChainId(),
            toAddress,
            lendParams.amount
        );

        bytes memory lzPayload = abi.encode(
            PT_YB_SEND_SGL_LEND,
            _from,
            toAddress,
            lendParams,
            approvals
        );

        bytes memory adapterParam = LzLib.buildDefaultAdapterParams(
            options.extraGasLimit
        );

        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(_from),
            options.zroPaymentAddress,
            adapterParam,
            msg.value
        );

        emit SendToChain(lzDstChainId, _from, toAddress, lendParams.amount);
    }

    // ================================
    // ========== YieldBox ============
    // ================================

    function _ybDeposit(
        uint16 _srcChainId,
        bytes memory _payload,
        IERC20 _erc20,
        bool _strategyDeposit
    ) internal virtual {
        (
            ,
            bytes32 fromAddressBytes, //from
            ,
            uint256 amount,
            uint256 assetId
        ) = abi.decode(_payload, (uint16, bytes32, bytes32, uint256, uint256));

        address onBehalfOf = _strategyDeposit
            ? address(this)
            : LzLib.bytes32ToAddress(fromAddressBytes);
        _creditTo(_srcChainId, address(this), amount);
        _depositToYieldbox(assetId, amount, _erc20, address(this), onBehalfOf);

        emit ReceiveFromChain(_srcChainId, onBehalfOf, amount);
    }

    function _ybWithdraw(
        uint16 _srcChainId,
        bytes memory _payload,
        bool _strategyWithdrawal
    ) internal virtual {
        (
            ,
            bytes32 from,
            ,
            uint256 _amount,
            uint256 _share,
            uint256 _assetId,
            address _zroPaymentAddress
        ) = abi.decode(
                _payload,
                (uint16, bytes32, bytes32, uint256, uint256, uint256, address)
            );

        address _from = LzLib.bytes32ToAddress(from);
        _retrieveFromYieldBox(
            _assetId,
            _amount,
            _share,
            _strategyWithdrawal ? address(this) : _from,
            address(this)
        );

        _debitFrom(
            address(this),
            lzEndpoint.getChainId(),
            LzLib.addressToBytes32(address(this)),
            _amount
        );
        bytes memory lzSendBackPayload = _encodeSendPayload(
            from,
            _ld2sd(_amount)
        );
        _lzSend(
            _srcChainId,
            lzSendBackPayload,
            payable(this),
            _zroPaymentAddress,
            "",
            address(this).balance
        );
        emit SendToChain(
            _srcChainId,
            _from,
            LzLib.addressToBytes32(address(this)),
            _amount
        );

        emit ReceiveFromChain(_srcChainId, _from, _amount);
    }

    /// @notice Receive an inter-chain transaction to execute a deposit inside YieldBox.
    function _depositToYieldbox(
        uint256 _assetId,
        uint256 _amount,
        IERC20 _erc20,
        address _from,
        address _to
    ) private {
        _erc20.approve(address(yieldBox), _amount);
        yieldBox.depositAsset(_assetId, _from, _to, _amount, 0);

        emit YieldBoxDeposit(_amount);
    }

    /// @notice Receive an inter-chain transaction to execute a deposit inside YieldBox.
    function _retrieveFromYieldBox(
        uint256 _assetId,
        uint256 _amount,
        uint256 _share,
        address _from,
        address _to
    ) private {
        yieldBox.withdraw(_assetId, _from, _to, _amount, _share);

        emit YieldBoxRetrieval(_amount);
    }

    /// @notice Deposit to this address, then use MarketHelper to deposit and add asset to market
    /// @dev Payload format: (uint16 packetType, bytes32 fromAddressBytes, bytes32 nonces, uint256 amount, address MarketHelper, address Market)
    /// @param _srcChainId The chain id of the source chain
    /// @param _payload The payload of the packet
    function _lend(uint16 _srcChainId, bytes memory _payload) internal virtual {
        (
            ,
            address from,
            ,
            ILendParams memory lendParams,
            IApproval[] memory approvals
        ) = abi.decode(
                _payload,
                (uint16, address, bytes32, ILendParams, IApproval[])
            );

        if (approvals.length > 0) {
            _callApproval(approvals);
        }

        _creditTo(_srcChainId, address(this), lendParams.amount);

        // Use market helper to deposit and add asset to market
        approve(address(lendParams.marketHelper), lendParams.amount);
        IMarketHelper(lendParams.marketHelper).depositAndAddAsset(
            lendParams.market,
            from,
            lendParams.amount,
            true,
            true
        );

        emit Lend(from, lendParams.amount);
    }

    function _callApproval(IApproval[] memory approvals) internal virtual {
        for (uint256 i = 0; i < approvals.length; ) {
            try
                IERC20Permit(approvals[i].target).permit(
                    approvals[i].owner,
                    approvals[i].spender,
                    approvals[i].value,
                    approvals[i].deadline,
                    approvals[i].v,
                    approvals[i].r,
                    approvals[i].s
                )
            {} catch Error(string memory reason) {
                if (!approvals[i].allowFailure) {
                    revert(reason);
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {
        uint256 packetType = _payload.toUint256(0); //because we are not using encodePacked

        if (packetType == PT_YB_SEND_STRAT) {
            _ybDeposit(_srcChainId, _payload, IERC20(address(this)), true);
        } else if (packetType == PT_YB_RETRIEVE_STRAT) {
            _ybWithdraw(_srcChainId, _payload, true);
        } else if (packetType == PT_YB_DEPOSIT) {
            _ybDeposit(_srcChainId, _payload, IERC20(address(this)), false);
        } else if (packetType == PT_YB_WITHDRAW) {
            _ybWithdraw(_srcChainId, _payload, false);
        } else if (packetType == PT_YB_SEND_SGL_LEND) {
            _lend(_srcChainId, _payload);
        } else {
            packetType = _payload.toUint8(0); //LZ uses encodePacked for payload
            if (packetType == PT_SEND) {
                _sendAck(_srcChainId, _srcAddress, _nonce, _payload);
            } else if (packetType == PT_SEND_AND_CALL) {
                _sendAndCallAck(_srcChainId, _srcAddress, _nonce, _payload);
            } else {
                revert("OFTCoreV2: unknown packet type");
            }
        }
    }
}
