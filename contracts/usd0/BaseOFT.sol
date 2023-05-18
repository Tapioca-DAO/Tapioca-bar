// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {BaseBoringBatchable} from "@boringcrypto/boring-solidity/contracts/BoringBatchable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "tapioca-periph/contracts/interfaces/IMagnetar.sol";
import "tapioca-periph/contracts/interfaces/IYieldBoxBase.sol";
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";
import "tapioca-sdk/dist/contracts/token/oft/v2/OFTV2.sol";

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
    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice the YieldBox address.
    IYieldBoxBase public immutable yieldBox;

    uint16 public constant PT_YB_SEND_SGL_LEND = 774;

    struct SendOptions {
        uint256 extraGasLimit;
        address zroPaymentAddress;
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

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when a lend operation is performed
    event Lend(address indexed _from, uint256 _amount);
    /// @notice event emitted when apporval is sent
    event SendApproval(
        address _target,
        address _owner,
        address _spender,
        uint256 _amount
    );

    /// @notice creates a new BaseOFT contract
    /// @param _yieldBox the YieldBox address
    constructor(IYieldBoxBase _yieldBox) {
        yieldBox = _yieldBox;
    }

    receive() external payable {}

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice sends to YieldBox over layer and lends asset to market
    /// @param _from sending address
    /// @param _to receiver address
    /// @param lzDstChainId LayerZero destination chain id
    /// @param lendParams lend specific params
    /// @param options send specific params
    /// @param approvals approvals specific params
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

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //

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
        IMagnetar(lendParams.marketHelper).depositAndAddAsset(
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
        uint256 packetType = _payload.toUint256(0);

        if (packetType == PT_YB_SEND_SGL_LEND) {
            _lend(_srcChainId, _payload);
        } else {
            packetType = _payload.toUint8(0);
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
