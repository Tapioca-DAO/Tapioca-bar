// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "tapioca-sdk/dist/contracts/interfaces/ILayerZeroEndpoint.sol";
import "tapioca-periph/contracts/interfaces/IERC3156FlashLender.sol";
import "./BaseUSDO.sol";

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
contract USDO is BaseUSDO, IERC3156FlashLender {
    modifier notPaused() {
        require(!paused, "USDO: paused");
        _;
    }

    /// @notice creates a new USDO0 OFT contract
    /// @param _lzEndpoint LayerZero endpoint
    /// @param _yieldBox the YieldBox address
    /// @param _owner owner address
    /// @param _leverageModule USDOLeverageModule address
    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        address _owner,
        address payable _leverageModule,
        address payable _marketModule,
        address payable _optionsModule
    )
        BaseUSDO(
            _lzEndpoint,
            _yieldBox,
            _owner,
            _leverageModule,
            _marketModule,
            _optionsModule
        )
    {}

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
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
}
