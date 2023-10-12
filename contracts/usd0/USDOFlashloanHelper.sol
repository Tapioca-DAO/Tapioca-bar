// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";

import "tapioca-periph/contracts/interfaces/IERC3156FlashLender.sol";
import {IUSDO} from "tapioca-periph/contracts/interfaces/IUSDO.sol";

contract USDOFlashloanHelper is IERC3156FlashLender, BoringOwnable {
    // ************ //
    // *** VARS *** //
    // ************ //
    IUSDO public immutable usdo;
    /// @notice returns the flash mint fee
    uint256 public flashMintFee;
    /// @notice returns the maximum amount of USDO that can be minted through the EIP-3156 flow
    uint256 public maxFlashMint;

    uint256 private constant FLASH_MINT_FEE_PRECISION = 1e6;
    bytes32 private constant FLASH_MINT_CALLBACK_SUCCESS =
        keccak256("ERC3156FlashBorrower.onFlashLoan");

    mapping(address => mapping(address => uint256)) private _allowances;

    bool private _flashloanEntered = false;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when flash mint fee is updated
    event FlashMintFeeUpdated(uint256 _old, uint256 _new);
    /// @notice event emitted when max flash mintable amount is updated
    event MaxFlashMintUpdated(uint256 _old, uint256 _new);

    constructor(IUSDO _usdo, address _owner) {
        owner = _owner;

        usdo = _usdo;

        flashMintFee = 10; // 0.001%
        maxFlashMint = 100_000 * 1e18; // 100k USDO
    }

    // ******************** //
    // *** VIEW METHODS *** //
    // ******************** //
    /// @notice returns the allowance for spender
    function allowance(
        address owner,
        address spender
    ) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @notice returns the maximum amount of tokens available for a flash mint
    function maxFlashLoan(address) public view override returns (uint256) {
        if (usdo.totalSupply() > maxFlashMint) {
            return maxFlashMint;
        } else {
            return usdo.totalSupply();
        }
    }

    /// @notice returns the flash mint fee
    /// @param token USDO address
    /// @param amount the amount for which fee is computed
    function flashFee(
        address token,
        uint256 amount
    ) public view override returns (uint256) {
        require(token == address(usdo), "USDOFlashloanHelper: token not valid");
        return (amount * flashMintFee) / FLASH_MINT_FEE_PRECISION;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice approves address for spending
    /// @param spender the spender's address
    /// @param amount the allowance amount
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @notice performs a USDO flashloan
    /// @param receiver the IERC3156FlashBorrower receiver
    /// @param token USDO address
    /// @param amount the amount to flashloan
    /// @param data flashloan data
    /// @return operation execution status
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override returns (bool) {
        require(!usdo.paused(), "USDOFlashloanHelper: paused");
        if (address(receiver) != msg.sender) {
            require(
                allowance(address(receiver), msg.sender) >= amount,
                "USDOFlashloanHelper: repay not approved"
            );
            _spendAllowance(address(receiver), msg.sender, amount);
        }

        require(!_flashloanEntered, "USDOFlashloanHelper: reentrancy");
        _flashloanEntered = true;
        require(
            maxFlashLoan(token) >= amount,
            "USDOFlashloanHelper: amount too big"
        );
        uint256 fee = flashFee(token, amount);
        usdo.mint(address(receiver), amount);

        require(
            receiver.onFlashLoan(msg.sender, token, amount, fee, data) ==
                FLASH_MINT_CALLBACK_SUCCESS,
            "USDOFlashloanHelper: failed"
        );
        uint256 _allowance = allowance(address(receiver), address(this));
        require(
            _allowance >= (amount + fee),
            "USDOFlashloanHelper: repay not approved"
        );
        _spendAllowance(address(receiver), address(this), amount + fee);
        usdo.burn(address(receiver), amount + fee);
        usdo.mint(address(this), fee);
        usdo.transfer(address(usdo), fee);
        usdo.addFlashloanFee(fee);
        _flashloanEntered = false;
        return true;
    }

    // ********************* //
    // *** OWNER METHODS *** //
    // ********************* //
    /// @notice set the max allowed USDO mintable through flashloan
    /// @dev can only be called by the owner
    /// @param _val the new amount
    function setMaxFlashMintable(uint256 _val) external onlyOwner {
        emit MaxFlashMintUpdated(maxFlashMint, _val);
        maxFlashMint = _val;
    }

    /// @notice set the flashloan fee
    /// @dev can only be called by the owner
    /// @param _val the new fee
    function setFlashMintFee(uint256 _val) external onlyOwner {
        require(_val < FLASH_MINT_FEE_PRECISION, "USDO: big");
        emit FlashMintFeeUpdated(flashMintFee, _val);
        flashMintFee = _val;
    }

    // *********************** //
    // *** PRIVATE METHODS *** //
    // *********************** //
    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) private {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(
                currentAllowance >= amount,
                "USDOFlashloanHelper: insufficient allowance"
            );
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function _approve(address owner, address spender, uint256 amount) private {
        require(
            owner != address(0),
            "USDOFlashloanHelper: approve from the zero address"
        );
        require(
            spender != address(0),
            "USDOFlashloanHelper: approve to the zero address"
        );

        _allowances[owner][spender] = amount;
    }
}
