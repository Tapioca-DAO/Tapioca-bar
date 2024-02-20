// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

//LZ
import {IMessagingChannel} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessagingChannel.sol";
import {MessagingReceipt, OFTReceipt} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {OAppReceiver} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppReceiver.sol";
import {Origin} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";

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

    constructor(UsdoInitStruct memory _initData, UsdoModulesInitStruct memory _modulesData)
        BaseUsdo(_initData)
        ERC20Permit("Tapioca Usdo")
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

        allowedMinter[_getChainId()][_initData.delegate] = true;
        allowedBurner[_getChainId()][_initData.delegate] = true;
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
     * @inheritdoc BaseTapiocaOmnichainEngine
     */
    function transferFrom(address _from, address _to, uint256 _amount)
        public
        override(BaseTapiocaOmnichainEngine, ERC20)
        returns (bool)
    {
        return BaseTapiocaOmnichainEngine.transferFrom(_from, _to, _amount);
    }

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
     * @notice Execute a call to a module.
     * @dev Example on how `_data` should be encoded:
     *      - abi.encodeCall(IERC20.transfer, (to, amount));
     * @dev Use abi.encodeCall to encode the function call and its parameters with type safety.
     *
     * @param _module The module to execute.
     * @param _data The data to execute. Should be ABI encoded with the selector.
     * @param _forwardRevert If true, forward the revert message from the module.
     *
     * @return returnData The return data from the module execution, if any.
     */
    function executeModule(IUsdo.Module _module, bytes memory _data, bool _forwardRevert)
        external
        payable
        whenNotPaused
        returns (bytes memory returnData)
    {
        return _executeModule(uint8(_module), _data, _forwardRevert);
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
        returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt)
    {
        (msgReceipt, oftReceipt) = abi.decode(
            _executeModule(
                uint8(IUsdo.Module.UsdoSender),
                abi.encodeCall(TapiocaOmnichainSender.sendPacket, (_lzSendParam, _composeMsg)),
                false
            ),
            (MessagingReceipt, OFTReceipt)
        );
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
     * @notice set the Cluster address.
     * @param _cluster the new Cluster address
     */
    function setCluster(address _cluster) external virtual onlyOwner {
        cluster = ICluster(_cluster);
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
