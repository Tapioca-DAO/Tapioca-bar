// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {IERC3156FlashBorrower} from "tapioca-periph/interfaces/bar/IERC3156FlashBorrower.sol";
import {IERC3156FlashLender} from "tapioca-periph/interfaces/bar/IERC3156FlashLender.sol";
import {IUsdo} from "tapioca-periph/interfaces/oft/IUsdo.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/**
 * @title USDOFlashloanHelper
 * @author TapiocaDAO
 * @notice The Usdo token flashloan capabilities
 */
contract USDOFlashloanHelper is IERC3156FlashLender, Ownable {
    using SafeERC20 for IERC20;

    IUsdo public immutable usdo;
    uint256 public flashMintFee;
    uint256 public maxFlashMint;

    uint256 private constant FLASH_MINT_FEE_PRECISION = 1e5;
    bytes32 private constant FLASH_MINT_CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    mapping(address => mapping(address => uint256)) private _allowances;

    bool private _flashloanEntered = false;

    error NotValid();
    error Paused();
    error AllowanceNotValid();
    error Reentrancy();
    error Failed();
    error AddressZero();
    error AmountTooBig();

    event FlashMintFeeUpdated(uint256 _old, uint256 _new);
    event MaxFlashMintUpdated(uint256 _old, uint256 _new);

    constructor(IUsdo _usdo, address _owner) {
        usdo = _usdo;

        flashMintFee = 1; // 0.001%
        maxFlashMint = 100_000 * 1e18; // 100k USDO

        _transferOwnership(_owner);
    }

    /// =====================
    /// View
    /// =====================
    /**
     * @notice returns the allowance for spender
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @notice returns the maximum amount of USDO available for a flash mint
     */
    function maxFlashLoan(address) public view override returns (uint256) {
        uint256 _supply = IERC20(address(usdo)).totalSupply();
        if (_supply > maxFlashMint) {
            return maxFlashMint;
        } else {
            return _supply;
        }
    }

    /**
     * @notice returns the flash mint fee
     * @param _usdo USDO address
     * @param amount the amount for which fee is computed
     */
    function flashFee(address _usdo, uint256 amount) public view override returns (uint256) {
        if (_usdo != address(usdo)) revert NotValid();
        return (amount * flashMintFee) / FLASH_MINT_FEE_PRECISION;
    }

    /// =====================
    /// External
    /// =====================
    /**
     * @notice approves address for spending
     * @param spender the spender's address
     * @param amount the allowance amount
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice performs a USDO flashloan
     * @param receiver the IERC3156FlashBorrower receiver
     * @param token USDO address
     * @param amount the amount to flashloan
     * @param data flashloan data
     * @return operation execution status
     */
    function flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data)
        external
        override
        returns (bool)
    {
        if (token != address(usdo)) revert NotValid();
        if (usdo.paused()) revert Paused();
        if (address(receiver) != msg.sender) {
            if (allowance(address(receiver), msg.sender) < amount) {
                revert AllowanceNotValid();
            }
            _spendAllowance(address(receiver), msg.sender, amount);
        }

        if (_flashloanEntered) revert Reentrancy();
        _flashloanEntered = true;
        if (maxFlashLoan(token) < amount) revert AmountTooBig();
        uint256 fee = flashFee(token, amount);
        usdo.mint(address(receiver), amount);
        usdo.addFlashloanFee(fee);

        if (receiver.onFlashLoan(msg.sender, token, amount, fee, data) != FLASH_MINT_CALLBACK_SUCCESS) revert Failed();

        //we burn from (this)
        IERC20(address(usdo)).safeTransferFrom(address(receiver), address(this), amount);

        // Stack to deep
        // usdo.burn(address(this), amount)
        assembly {
            // Free memory pointer
            let freeMemPointer := mload(0x40)

            // keccak256("burn(address,uint256)")
            mstore(freeMemPointer, shl(224, 0x9dc29fac))

            mstore(add(freeMemPointer, 4), address())
            mstore(add(freeMemPointer, 36), amount)

            // Execute the call
            let success :=
                call(
                    gas(), // Send all gas
                    token, // The address of the usdo contract
                    0, // No ether is sent
                    freeMemPointer, // Input pointer
                    68, // Input length (4 bytes for method ID + 32 bytes for address + 32 bytes for uint256)
                    0,
                    0
                )

            // Check for failure and revert
            if iszero(success) { revert(0, 0) }

            // Adjust the free memory pointer
            mstore(0x40, add(freeMemPointer, 68))
        }

        IERC20(address(usdo)).safeTransferFrom(address(receiver), address(usdo), fee);

        _flashloanEntered = false;

        return true;
    }

    /// =====================
    /// Owner
    /// =====================
    /**
     * @notice set the max allowed USDO mintable through flashloan
     * @param _val the new amount
     */
    function setMaxFlashMintable(uint256 _val) external onlyOwner {
        emit MaxFlashMintUpdated(maxFlashMint, _val);
        maxFlashMint = _val;
    }

    /**
     * @notice set the flashloan fee
     * @param _val the new fee
     */
    function setFlashMintFee(uint256 _val) external onlyOwner {
        if (_val >= FLASH_MINT_FEE_PRECISION) revert NotValid();
        emit FlashMintFeeUpdated(flashMintFee, _val);
        flashMintFee = _val;
    }

    // *********************** //
    // *** PRIVATE METHODS *** //
    // *********************** //
    function _spendAllowance(address owner, address spender, uint256 amount) private {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert AllowanceNotValid();

            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function _approve(address owner, address spender, uint256 amount) private {
        if (owner == address(0)) revert AddressZero();
        if (spender == address(0)) revert AddressZero();

        _allowances[owner][spender] = amount;
    }
}
