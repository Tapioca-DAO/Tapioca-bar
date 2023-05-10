// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "tapioca-sdk/dist/contracts/interfaces/ILayerZeroEndpoint.sol";
import "./USDOMocks.sol";
import "tapioca-periph/contracts/interfaces/IERC3156FlashLender.sol";

/*

__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__

*/

/// @title USDO OFT contract
contract USDO is USDOMocks, IERC3156FlashLender {
    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice returns the Conservator address
    address public conservator;
    /// @notice addresses allowed to mint USDO
    /// @dev chainId>address>status
    mapping(uint256 => mapping(address => bool)) public allowedMinter;
    /// @notice addresses allowed to burn USDO
    /// @dev chainId>address>status
    mapping(uint256 => mapping(address => bool)) public allowedBurner;
    /// @notice returns the pause state of the contract
    bool public paused;

    /// @notice returns the flash mint fee
    uint256 public flashMintFee;
    /// @notice returns the maximum amount of USDO that can be minted through the EIP-3156 flow
    uint256 public maxFlashMint;

    uint256 constant FLASH_MINT_FEE_PRECISION = 1e6;
    bytes32 constant FLASH_MINT_CALLBACK_SUCCESS =
        keccak256("ERC3156FlashBorrower.onFlashLoan");

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when USDO is minted
    event Minted(address indexed _for, uint256 _amount);
    /// @notice event emitted when USDO is burned
    event Burned(address indexed _from, uint256 _amount);
    /// @notice event emitted when a new address is set or removed from minters array
    event SetMinterStatus(address indexed _for, bool _status);
    /// @notice event emitted when a new address is set or removed from burners array
    event SetBurnerStatus(address indexed _for, bool _status);
    /// @notice event emitted when conservator address is updated
    event ConservatorUpdated(address indexed old, address indexed _new);
    /// @notice event emitted when pause state is updated
    event PausedUpdated(bool oldState, bool newState);
    /// @notice event emitted when flash mint fee is updated
    event FlashMintFeeUpdated(uint256 _old, uint256 _new);
    /// @notice event emitted when max flash mintable amount is updated
    event MaxFlashMintUpdated(uint256 _old, uint256 _new);

    modifier notPaused() {
        require(!paused, "USDO: paused");
        _;
    }

    /// @notice creates a new USDO0 OFT contract
    /// @param _lzEndpoint LayerZero endpoint
    /// @param _yieldBox the YieldBox address
    /// @param _owner owner address
    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        address _owner
    )
        OFTV2("USDO", "USDO", 8, _lzEndpoint)
        USDOMocks(_yieldBox)
        ERC20Permit("USDO")
    {
        uint256 chain = _getChainId();
        allowedMinter[chain][msg.sender] = true;
        allowedBurner[chain][msg.sender] = true;
        flashMintFee = 10; // 0.001%
        maxFlashMint = 100_000 * 1e18; // 100k USDO

        mintLimit = 1_000_000_000 * 1e18;

        transferOwnership(_owner);
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns token's decimals
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice returns the maximum amount of tokens available for a flash mint
    function maxFlashLoan(address) public view override returns (uint256) {
        return maxFlashMint;
    }

    /// @notice returns the flash mint fee
    /// @param token USDO address
    /// @param amount the amount for which fee is computed
    function flashFee(
        address token,
        uint256 amount
    ) public view override returns (uint256) {
        require(token == address(this), "USDO: token not valid");
        return (amount * flashMintFee) / FLASH_MINT_FEE_PRECISION;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
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
    ) external override notPaused returns (bool) {
        require(token == address(this), "USDO: token not valid");
        require(maxFlashLoan(token) >= amount, "USDO: amount too big");
        require(amount > 0, "USDO: amount not valid");
        uint256 fee = flashFee(token, amount);
        _mint(address(receiver), amount);

        require(
            receiver.onFlashLoan(msg.sender, token, amount, fee, data) ==
                FLASH_MINT_CALLBACK_SUCCESS,
            "USDO: failed"
        );

        uint256 _allowance = allowance(address(receiver), address(this));
        require(_allowance >= (amount + fee), "USDO: repay not approved");
        _approve(address(receiver), address(this), _allowance - (amount + fee));
        _burn(address(receiver), amount + fee);
        return true;
    }

    /// @notice mints USDO
    /// @param _to receiver address
    /// @param _amount the amount to mint
    function mint(address _to, uint256 _amount) external notPaused {
        require(allowedMinter[_getChainId()][msg.sender], "USDO: unauthorized");
        _mint(_to, _amount);
        emit Minted(_to, _amount);
    }

    /// @notice burns USDO
    /// @param _from address to burn from
    /// @param _amount the amount to burn
    function burn(address _from, uint256 _amount) external notPaused {
        require(allowedBurner[_getChainId()][msg.sender], "USDO: unauthorized");
        _burn(_from, _amount);
        emit Burned(_from, _amount);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
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
        require(_val < FLASH_MINT_FEE_PRECISION, "USDO: fee too big");
        emit FlashMintFeeUpdated(flashMintFee, _val);
        flashMintFee = _val;
    }

    /// @notice set the Conservator address
    /// @dev conservator can pause the contract
    /// @param _conservator the new address
    function setConservator(address _conservator) external onlyOwner {
        require(_conservator != address(0), "USDO: address not valid");
        emit ConservatorUpdated(conservator, _conservator);
        conservator = _conservator;
    }

    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(bool val) external {
        require(msg.sender == conservator, "USDO: unauthorized");
        require(val != paused, "USDO: same state");
        emit PausedUpdated(paused, val);
        paused = val;
    }

    /// @notice sets/unsets address as minter
    /// @dev can only be called by the owner
    /// @param _for role receiver
    /// @param _status true/false
    function setMinterStatus(address _for, bool _status) external onlyOwner {
        allowedMinter[_getChainId()][_for] = _status;
        emit SetMinterStatus(_for, _status);
    }

    /// @notice sets/unsets address as burner
    /// @dev can only be called by the owner
    /// @param _for role receiver
    /// @param _status true/false
    function setBurnerStatus(address _for, bool _status) external onlyOwner {
        allowedBurner[_getChainId()][_for] = _status;
        emit SetBurnerStatus(_for, _status);
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    /// @notice Return the current Layer-Zero "chain ID", not the actual `chainId` OPCODE output.
    /// @dev Useful for testing.
    function _getChainId() private view returns (uint256) {
        return ILayerZeroEndpoint(lzEndpoint).getChainId();
    }
}
