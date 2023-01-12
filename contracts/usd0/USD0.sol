// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import 'tapioca-sdk/dist/contracts/interfaces/ILayerZeroEndpoint.sol';
import './BaseOFT.sol';
import './interfaces/IERC3156FlashLender.sol';

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

/// @title USD0 OFT contract
contract USD0 is BaseOFT, IERC3156FlashLender {
    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice returns the Conservator address
    address public conservator;
    /// @notice addresses allowed to mint USD0
    /// @dev chainId>address>status
    mapping(uint256 => mapping(address => bool)) public allowedMinter;
    /// @notice addresses allowed to burn USD0
    /// @dev chainId>address>status
    mapping(uint256 => mapping(address => bool)) public allowedBurner;
    /// @notice returns the pause state of the contract
    bool public paused;

    /// @notice returns the flash mint fee
    uint256 public flashMintFee;
    /// @notice returns the maximum amount of USD0 that can be minted through the EIP-3156 flow
    uint256 public maxFlashMint;

    uint256 constant FLASH_MINT_FEE_PRECISION = 1e6;
    bytes32 constant FLASH_MINT_CALLBACK_SUCCESS =
        keccak256('ERC3156FlashBorrower.onFlashLoan');

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event Minted(address indexed _for, uint256 _amount);
    event Burned(address indexed _from, uint256 _amount);
    event SetMinterStatus(address indexed _for, bool _status);
    event SetBurnerStatus(address indexed _for, bool _status);
    event ConservatorUpdated(address indexed old, address indexed _new);
    event PausedUpdated(bool oldState, bool newState);
    event FlashMintFeeUpdated(uint256 _old, uint256 _new);
    event MaxFlashMintUpdated(uint256 _old, uint256 _new);

    modifier notPaused() {
        require(!paused, 'USD0: paused');
        _;
    }

    /// @notice creates a new USDO0 OFT contract
    /// @param _lzEndpoint LayerZero endpoint
    constructor(address _lzEndpoint, IYieldBox _yieldBox)
        OFT('USD0', 'USD0', _lzEndpoint)
        BaseOFT(_yieldBox)
    {
        uint256 chain = _getChainId();
        allowedMinter[chain][msg.sender] = true;
        allowedBurner[chain][msg.sender] = true;
        flashMintFee = 10; // 0.001%
        maxFlashMint = 100_000 * 1e18; // 100k USD0
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
    function flashFee(address token, uint256 amount)
        public
        view
        override
        returns (uint256)
    {
        require(token == address(this), 'USD0: token not valid');
        return (amount * flashMintFee) / FLASH_MINT_FEE_PRECISION;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override notPaused returns (bool) {
        require(token == address(this), 'USD0: token not valid');
        require(maxFlashLoan(token) >= amount, 'USD0: amount too big');
        require(amount > 0, 'USD0: amount not valid');
        uint256 fee = flashFee(token, amount);
        _mint(address(receiver), amount);

        require(
            receiver.onFlashLoan(msg.sender, token, amount, fee, data) ==
                FLASH_MINT_CALLBACK_SUCCESS,
            'USD0: failed'
        );

        uint256 _allowance = allowance(address(receiver), address(this));
        require(_allowance >= (amount + fee), 'USD0: repay not approved');
        _approve(address(receiver), address(this), _allowance - (amount + fee));
        _burn(address(receiver), amount + fee);
        return true;
    }

    /// @notice mints USD0
    /// @param _to receiver address
    /// @param _amount the amount to mint
    function mint(address _to, uint256 _amount) external notPaused {
        require(allowedMinter[_getChainId()][msg.sender], 'USD0: unauthorized');
        _mint(_to, _amount);
        emit Minted(_to, _amount);
    }

    /// @notice burns USD0
    /// @param _from address to burn from
    /// @param _amount the amount to burn
    function burn(address _from, uint256 _amount) external notPaused {
        require(allowedBurner[_getChainId()][msg.sender], 'USD0: unauthorized');
        _burn(_from, _amount);
        emit Burned(_from, _amount);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //

    /// @notice set the max allowed USD0 mintable through flashloan
    /// @param _val the new amount
    function setMaxFlashMintable(uint256 _val) external onlyOwner {
        emit MaxFlashMintUpdated(maxFlashMint, _val);
        maxFlashMint = _val;
    }

    /// @notice set the flashloan fee
    /// @param _val the new fee
    function setFlashMintFee(uint256 _val) external onlyOwner {
        require(_val < FLASH_MINT_FEE_PRECISION, 'USD0: fee too big');
        emit FlashMintFeeUpdated(flashMintFee, _val);
        flashMintFee = _val;
    }

    /// @notice Set the Conservator address
    /// @dev Conservator can pause the contract
    /// @param _conservator The new address
    function setConservator(address _conservator) external onlyOwner {
        require(_conservator != address(0), 'USD0: address not valid');
        emit ConservatorUpdated(conservator, _conservator);
        conservator = _conservator;
    }

    /// @notice updates the pause state of the contract
    /// @param val the new value
    function updatePause(bool val) external {
        require(msg.sender == conservator, 'USD0: unauthorized');
        require(val != paused, 'USD0: same state');
        emit PausedUpdated(paused, val);
        paused = val;
    }

    /// @notice sets/unsets address as minter
    /// @param _for role receiver
    /// @param _status true/false
    function setMinterStatus(address _for, bool _status) external onlyOwner {
        allowedMinter[_getChainId()][_for] = _status;
        emit SetMinterStatus(_for, _status);
    }

    /// @notice sets/unsets address as burner
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
