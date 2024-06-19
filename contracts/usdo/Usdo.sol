// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

//LZ
import {
    MessagingReceipt,
    OFTReceipt,
    SendParam,
    MessagingFee
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {IMessagingChannel} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessagingChannel.sol";
import {OAppReceiver} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppReceiver.sol";
import {Origin} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {OFTCore} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

// External
import {ERC20Permit, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

import {
    IUsdo,
    UsdoInitStruct,
    UsdoModulesInitStruct,
    LZSendParam,
    ERC20PermitStruct
} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {BaseTapiocaOmnichainEngine} from "tapioca-periph/tapiocaOmnichainEngine/BaseTapiocaOmnichainEngine.sol";
import {TapiocaOmnichainSender} from "tapioca-periph/tapiocaOmnichainEngine/TapiocaOmnichainSender.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {UsdoReceiver} from "./modules/UsdoReceiver.sol";
import {UsdoSender} from "./modules/UsdoSender.sol";
import {BaseUsdo} from "./BaseUsdo.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/**
 * @title Usdo
 * @author TapiocaDAO
 * @notice The OmniDollar
 */
contract Usdo is BaseUsdo, Pausable, ReentrancyGuard, ERC20Permit {
    error Usdo_NotValid();
    error Usdo_NotAuthorized();

    uint256 private _fees;

    address public flashLoanHelper;

    /**
     * @notice addresses allowed to mint USDO
     * @dev chainId>address>status
     */
    mapping(uint256 => mapping(address => bool)) public allowedMinter;
    /**
     * @notice addresses allowed to burn USDO
     * @dev chainId>address>status
     */
    mapping(uint256 => mapping(address => bool)) public allowedBurner;

    event SetMinterStatus(address indexed _for, bool _status);
    event SetBurnerStatus(address indexed _for, bool _status);
    event ConservatorUpdated(address indexed old, address indexed _new);

    error AddressNotValid();

    constructor(UsdoInitStruct memory _initData, UsdoModulesInitStruct memory _modulesData)
        BaseUsdo(_initData)
        ERC20Permit("USDO Stablecoin")
    {
        if (_modulesData.usdoSenderModule == address(0)) revert Usdo_NotValid();
        if (_modulesData.usdoReceiverModule == address(0)) {
            revert Usdo_NotValid();
        }
        if (_modulesData.marketReceiverModule == address(0)) {
            revert Usdo_NotValid();
        }
        if (_modulesData.optionReceiverModule == address(0)) {
            revert Usdo_NotValid();
        }

        _setModule(uint8(IUsdo.Module.UsdoSender), _modulesData.usdoSenderModule);
        _setModule(uint8(IUsdo.Module.UsdoReceiver), _modulesData.usdoReceiverModule);
        _setModule(uint8(IUsdo.Module.UsdoMarketReceiver), _modulesData.marketReceiverModule);
        _setModule(uint8(IUsdo.Module.UsdoOptionReceiver), _modulesData.optionReceiverModule);

        _transferOwnership(_initData.delegate);
    }

    /**
     * @dev Fallback function should handle calls made by endpoint, which should go to the receiver module.
     */
    fallback() external payable {
        /// @dev Call the receiver module on fallback, assume it's gonna be called by endpoint.
        _executeModule(uint8(IUsdo.Module.UsdoReceiver), msg.data, false);
    }

    receive() external payable {}

    /**
     * @dev Slightly modified version of the OFT _lzReceive() operation.
     * The composed message is sent to `address(this)` instead of `toAddress`.
     * @dev Internal function to handle the receive on the LayerZero endpoint.
     * @param _origin The origin information.
     *  - srcEid: The source chain endpoint ID.
     *  - sender: The sender address from the src chain.
     *  - nonce: The nonce of the LayerZero message.
     * @param _guid The unique identifier for the received LayerZero message.
     * @param _message The encoded message.
     * @dev _executor The address of the executor.
     * @dev _extraData Additional data.
     */
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor, // @dev unused in the default implementation.
        bytes calldata _extraData // @dev unused in the default implementation.
    ) public payable override {
        // Call the internal OApp implementation of lzReceive.
        _executeModule(
            uint8(IUsdo.Module.UsdoReceiver),
            abi.encodeWithSelector(OAppReceiver.lzReceive.selector, _origin, _guid, _message, _executor, _extraData),
            false
        );
    }

    /**
     * @dev Slightly modified version of the OFT send() operation. Includes a `_msgType` parameter.
     * The `_buildMsgAndOptionsByType()` appends the packet type to the message.
     * @dev Executes the send operation.
     * @param _lzSendParam The parameters for the send operation.
     *      - _sendParam: The parameters for the send operation.
     *          - dstEid::uint32: Destination endpoint ID.
     *          - to::bytes32: Recipient address.
     *          - amountToSendLD::uint256: Amount to send in local decimals.
     *          - minAmountToCreditLD::uint256: Minimum amount to credit in local decimals.
     *      - _fee: The calculated fee for the send() operation.
     *          - nativeFee::uint256: The native fee.
     *          - lzTokenFee::uint256: The lzToken fee.
     *      - _extraOptions::bytes: Additional options for the send() operation.
     *      - refundAddress::address: The address to refund the native fee to.
     * @param _composeMsg The composed message for the send() operation. Is a combination of 1 or more TAP specific messages.
     *
     * @return msgReceipt The receipt for the send operation.
     *      - guid::bytes32: The unique identifier for the sent message.
     *      - nonce::uint64: The nonce of the sent message.
     *      - fee: The LayerZero fee incurred for the message.
     *          - nativeFee::uint256: The native fee.
     *          - lzTokenFee::uint256: The lzToken fee.
     * @return oftReceipt The OFT receipt information.
     *      - amountDebitLD::uint256: Amount of tokens ACTUALLY debited in local decimals.
     *      - amountCreditLD::uint256: Amount of tokens to be credited on the remote side.
     */
    function sendPacket(LZSendParam calldata _lzSendParam, bytes calldata _composeMsg)
        public
        payable
        whenNotPaused
        returns (
            MessagingReceipt memory msgReceipt,
            OFTReceipt memory oftReceipt,
            bytes memory message,
            bytes memory options
        )
    {
        (msgReceipt, oftReceipt, message, options) = abi.decode(
            _executeModule(
                uint8(IUsdo.Module.UsdoSender),
                abi.encodeCall(TapiocaOmnichainSender.sendPacket, (_lzSendParam, _composeMsg)),
                false
            ),
            (MessagingReceipt, OFTReceipt, bytes, bytes)
        );
    }

    /**
     * @dev See `TapiocaOmnichainSender.sendPacketFrom`
     */
    function sendPacketFrom(address _from, LZSendParam calldata _lzSendParam, bytes calldata _composeMsg)
        public
        payable
        whenNotPaused
        returns (
            MessagingReceipt memory msgReceipt,
            OFTReceipt memory oftReceipt,
            bytes memory message,
            bytes memory options
        )
    {
        (msgReceipt, oftReceipt, message, options) = abi.decode(
            _executeModule(
                uint8(IUsdo.Module.UsdoSender),
                abi.encodeCall(TapiocaOmnichainSender.sendPacketFrom, (_from, _lzSendParam, _composeMsg)),
                false
            ),
            (MessagingReceipt, OFTReceipt, bytes, bytes)
        );
    }

    /**
     * See `OFTCore::send()`
     * @dev override default `send` behavior to add `whenNotPaused` modifier
     */
    function send(SendParam calldata _sendParam, MessagingFee calldata _fee, address _refundAddress)
        external
        payable
        override(OFTCore)
        whenNotPaused
        returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt)
    {
        // @dev Applies the token transfers regarding this send() operation.
        // - amountSentLD is the amount in local decimals that was ACTUALLY sent/debited from the sender.
        // - amountReceivedLD is the amount in local decimals that will be received/credited to the recipient on the remote OFT instance.
        (uint256 amountSentLD, uint256 amountReceivedLD) =
            _debit(msg.sender, _sendParam.amountLD, _sendParam.minAmountLD, _sendParam.dstEid);

        // @dev Builds the options and OFT message to quote in the endpoint.
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam, amountReceivedLD);

        // @dev Sends the message to the LayerZero endpoint and returns the LayerZero msg receipt.
        msgReceipt = _lzSend(_sendParam.dstEid, message, options, _fee, _refundAddress);
        // @dev Formulate the OFT receipt.
        oftReceipt = OFTReceipt(amountSentLD, amountReceivedLD);

        emit OFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, amountSentLD, amountReceivedLD);
    }

    /// =====================
    /// View
    /// =====================
    /**
     * @notice returns token's decimals
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @dev Returns the hash of the struct used by the permit function.
     * @param _permitData Struct containing permit data.
     */
    function getTypedDataHash(ERC20PermitStruct calldata _permitData) public view returns (bytes32) {
        bytes32 permitTypeHash_ =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

        bytes32 structHash_ = keccak256(
            abi.encode(
                permitTypeHash_,
                _permitData.owner,
                _permitData.spender,
                _permitData.value,
                _permitData.nonce,
                _permitData.deadline
            )
        );
        return _hashTypedDataV4(structHash_);
    }

    /// =====================
    /// External
    /// =====================
    /**
     * @notice mints USDO
     * @param _to receiver address
     * @param _amount the amount to mint
     */
    function mint(address _to, uint256 _amount) external whenNotPaused {
        if (!allowedMinter[_getChainId()][msg.sender]) {
            revert Usdo_NotAuthorized();
        }
        _mint(_to, _amount);
    }

    /**
     * @notice burns USDO
     * @param _from address to burn from
     * @param _amount the amount to burn
     */
    function burn(address _from, uint256 _amount) external whenNotPaused {
        if (!allowedBurner[_getChainId()][msg.sender]) {
            revert Usdo_NotAuthorized();
        }
        _burn(_from, _amount);
    }

    /**
     * @notice registeres flashloan fees
     * @dev can only be called by the `FlashloanHelper` contract
     * @param _fee fees amount
     */
    function addFlashloanFee(uint256 _fee) external {
        if (msg.sender != flashLoanHelper) revert Usdo_NotAuthorized();
        _fees += _fee;
    }

    /// =====================
    /// Owner
    /// =====================
    /**
     * @notice Un/Pauses this contract.
     */
    function setPause(bool _pauseState) external {
        if (!getCluster().hasRole(msg.sender, keccak256("PAUSABLE")) && msg.sender != owner()) {
            revert Usdo_NotAuthorized();
        }
        if (_pauseState) {
            _pause();
        } else {
            _unpause();
        }
    }

    /**
     * @notice sets `FlashloanHelper` contract
     * @param _helper the contract address
     */
    function setFlashloanHelper(address _helper) external onlyOwner {
        flashLoanHelper = _helper;
    }

    /**
     * @notice transfers fees to sender
     */
    function extractFees() external onlyOwner {
        if (_fees > 0) {
            uint256 balance = balanceOf(address(this));

            uint256 toExtract = balance >= _fees ? _fees : balance;
            _fees -= toExtract;
            _transfer(address(this), msg.sender, toExtract);
        }
    }

    /**
     * @notice sets/unsets address as minter
     * @dev can only be called by the owner
     * @param _for role receiver
     * @param _status true/false
     */
    function setMinterStatus(address _for, bool _status) external onlyOwner {
        allowedMinter[_getChainId()][_for] = _status;
        emit SetMinterStatus(_for, _status);
    }

    /**
     * @notice sets/unsets address as burner
     * @dev can only be called by the owner
     * @param _for role receiver
     * @param _status true/false
     */
    function setBurnerStatus(address _for, bool _status) external onlyOwner {
        allowedBurner[_getChainId()][_for] = _status;
        emit SetBurnerStatus(_for, _status);
    }

    /// =====================
    /// Private
    /// =====================
    /**
     * @notice Return the current chain EID.
     */
    function _getChainId() internal view virtual override returns (uint32) {
        return IMessagingChannel(endpoint).eid();
    }
}
