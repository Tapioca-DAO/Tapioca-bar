// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";
import "tapioca-sdk/dist/contracts/token/oft/v2/OFTV2.sol";
import "./interfaces/IUSD0.sol";
import "./interfaces/IYieldBox.sol";
import "./interfaces/IBigBang.sol";
import "../interfaces/ITapiocaOFT.sol";
import "../interfaces/IMarketsProxy.sol";
import "../swappers/INonYieldBoxSwapper.sol";

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

abstract contract BaseUsd0 is OFTV2 {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;

    /// @notice The YieldBox address.
    IYieldBox public immutable yieldBox;

    uint16 public constant PT_YB_SEND_STRAT = 770;
    uint16 public constant PT_YB_RETRIEVE_STRAT = 771;
    uint16 public constant PT_YB_DEPOSIT = 772;
    uint16 public constant PT_YB_WITHDRAW = 773;
    uint16 public constant PT_LEVERAGE_MARKET = 774;

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

    constructor(IYieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    receive() external payable {}

    // ==========================
    // ========== LZ ============
    // ==========================
    function sendToYB(
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        uint256 extraGasLimit,
        address zroPaymentAddress,
        bool strategyDeposit
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(msg.sender);
        _debitFrom(msg.sender, lzEndpoint.getChainId(), toAddress, amount);

        bytes memory lzPayload = abi.encode(
            strategyDeposit ? PT_YB_SEND_STRAT : PT_YB_DEPOSIT,
            LzLib.addressToBytes32(msg.sender),
            toAddress,
            amount,
            assetId
        );
        bytes memory adapterParam = LzLib.buildDefaultAdapterParams(
            extraGasLimit
        );
        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(msg.sender),
            zroPaymentAddress,
            adapterParam,
            msg.value
        );
        emit SendToChain(lzDstChainId, msg.sender, toAddress, amount);
    }

    function retrieveFromYB(
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        bytes memory airdropAdapterParam,
        bool strategyWithdrawal
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(msg.sender);

        bytes memory lzPayload = abi.encode(
            strategyWithdrawal ? PT_YB_RETRIEVE_STRAT : PT_YB_WITHDRAW,
            LzLib.addressToBytes32(msg.sender),
            toAddress,
            amount,
            0,
            assetId,
            zroPaymentAddress
        );
        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(msg.sender),
            zroPaymentAddress,
            airdropAdapterParam,
            msg.value
        );
        emit SendToChain(lzDstChainId, msg.sender, toAddress, amount);
    }

    function sendForLeverage(
        uint256 amount,
        address leverageFor,
        IUSD0.LeverageLZData calldata lzData,
        IUSD0.LeverageSwapData calldata swapData,
        IUSD0.LeverageExternalContractsData calldata externalData
    ) external payable {
        bytes32 proxyBytes = LzLib.addressToBytes32(externalData.proxy);
        _debitFrom(msg.sender, lzEndpoint.getChainId(), proxyBytes, amount);

        bytes memory lzPayload = abi.encode(
            PT_LEVERAGE_MARKET,
            LzLib.addressToBytes32(msg.sender),
            proxyBytes,
            amount,
            swapData,
            externalData,
            lzData.zroPaymentAddress,
            leverageFor
        );

        _lzSend(
            lzData.lzDstChainId,
            lzPayload,
            payable(lzData.refundAddress),
            lzData.zroPaymentAddress,
            lzData.airdropAdapterParam, //needed for send back operation
            msg.value
        );
        emit SendToChain(lzData.lzDstChainId, msg.sender, proxyBytes, amount);
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

    function _leverage(
        uint16 _srcChainId,
        bytes memory _payload
    ) internal virtual {
        (
            ,
            ,
            ,
            uint256 amount,
            IUSD0.LeverageSwapData memory swapData,
            IUSD0.LeverageExternalContractsData memory externalData,
            address zroPaymentAddress,
            address leverageFor
        ) = abi.decode(
                _payload,
                (
                    uint16,
                    bytes32,
                    bytes32,
                    uint256,
                    IUSD0.LeverageSwapData,
                    IUSD0.LeverageExternalContractsData,
                    address,
                    address
                )
            );

        _creditTo(_srcChainId, address(this), amount);

        //swap
        approve(externalData.swapper, amount);
        uint256 amountOut = INonYieldBoxSwapper(externalData.swapper).swap(
            address(this),
            swapData.tokenOut,
            amount,
            swapData.amountOutMin,
            swapData.data
        );

        //wrap
        uint256 oftBalanceBefore = ITapiocaOFT(externalData.tOft).balanceOf(
            address(this)
        );
        ITapiocaOFT(externalData.tOft).wrapNative{value: amountOut}(
            address(this)
        );
        uint256 oftBalanceAfter = ITapiocaOFT(externalData.tOft).balanceOf(
            address(this)
        );
        require(oftBalanceAfter > oftBalanceBefore, "USD0: wrap failed");

        //send to YB
        ITapiocaOFT(externalData.tOft).sendToYB{value: address(this).balance}(
            oftBalanceAfter - oftBalanceBefore,
            leverageFor,
            externalData.dstAssetId,
            _srcChainId,
            externalData.sendToYBExtraGasLimit,
            zroPaymentAddress,
            false
        );

        //add collateral through proxy
        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeWithSelector(
            IBigBang.addCollateral.selector,
            leverageFor,
            leverageFor,
            false,
            oftBalanceAfter - oftBalanceBefore,
            0
        );
        //gas: we use the entire available amount; the rest is returned to this contract
        bytes memory executeOnChainParams = LzLib.buildDefaultAdapterParams(
            externalData.executeOnChainGasLimit
        );
        IMarketsProxy(externalData.proxy).executeOnChain{
            value: address(this).balance
        }(
            externalData.srcLzChainId,
            externalData.srcMarket,
            calls,
            executeOnChainParams
        );
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
        } else if (packetType == PT_LEVERAGE_MARKET) {
            _leverage(_srcChainId, _payload);
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
