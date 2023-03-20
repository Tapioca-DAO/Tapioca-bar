// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "tapioca-sdk/dist/contracts/token/oft/v2/OFTV2.sol";
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";
import "../usd0/interfaces/IYieldBox.sol";

contract TapiocaOftMock is OFTV2 {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;

    uint16 public constant PT_YB_DEPOSIT = 772;

    IERC20 public erc20;
    IYieldBox public immutable yieldBox;

    bool public isNative;
    uint256 public hostId;

    constructor(
        uint256 _chainId,
        address _erc20,
        address _lzEndpoint,
        IYieldBox _yieldBox
    ) OFTV2("Tapioca OFT", "tOFT", 8, _lzEndpoint) {
        hostId = _chainId;
        erc20 = IERC20(_erc20);
        yieldBox = _yieldBox;
    }

    function setHostChain(uint256 _newchain) external {
        hostId = _newchain;
    }

    function freeMint(uint256 _val) public {
        _mint(msg.sender, _val);
    }

    function wrap(address _toAddress, uint256 _amount) external {
        erc20.safeTransferFrom(msg.sender, address(this), _amount);
        _mint(_toAddress, _amount);
    }

    function wrapNative(address _toAddress) external payable {
        require(msg.value > 0, "TapiocaOftMock: no value");
        _mint(_toAddress, msg.value);
    }

    function sendToYB(
        uint256 amount,
        address depositFor,
        uint256 assetId,
        uint16 lzDstChainId,
        uint256 extraGasLimit,
        address zroPaymentAddress,
        bool
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(msg.sender);
        _debitFrom(msg.sender, lzEndpoint.getChainId(), toAddress, amount);

        bytes memory lzPayload = abi.encode(
            PT_YB_DEPOSIT,
            LzLib.addressToBytes32(depositFor),
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

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {
        uint256 packetType = _payload.toUint256(0); //because we are not using encodePacked

        if (packetType == PT_YB_DEPOSIT) {
            _ybDeposit(_srcChainId, _payload, IERC20(address(this)), false);
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

    function _depositToYieldbox(
        uint256 _assetId,
        uint256 _amount,
        IERC20 _erc20,
        address _from,
        address _to
    ) private {
        _erc20.approve(address(yieldBox), _amount);
        yieldBox.depositAsset(_assetId, _from, _to, _amount, 0);
    }
}
