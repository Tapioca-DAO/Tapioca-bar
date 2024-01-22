// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// Tapioca
import {ILayerZeroEndpoint} from "tapioca-periph/layerzero/v1/interfaces/ILayerZeroEndpoint.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BaseUSDO} from "./BaseUSDO.sol";

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
contract USDO is BaseUSDO {
    uint256 private _fees;

    address public flashLoanHelper;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error Paused();

    modifier notPaused() {
        if (paused) revert Paused();
        _;
    }

    /// @notice creates a new USDO0 OFT contract
    /// @param _lzEndpoint LayerZero endpoint
    /// @param _yieldBox the YieldBox address
    /// @param _owner owner address
    /// @param _leverageModule USDOLeverageModule address
    constructor(
        address _lzEndpoint,
        IYieldBox _yieldBox,
        ICluster _cluster,
        address _owner,
        address payable _leverageModule,
        address payable _leverageDestinationModule,
        address payable _marketModule,
        address payable _marketDestinationModule,
        address payable _optionsModule,
        address payable _optionsDestinationModule,
        address payable _genericModule
    )
        BaseUSDO(
            _lzEndpoint,
            _yieldBox,
            _cluster,
            _owner,
            _leverageModule,
            _leverageDestinationModule,
            _marketModule,
            _marketDestinationModule,
            _optionsModule,
            _optionsDestinationModule,
            _genericModule
        )
    {}

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice mints USDO
    /// @param _to receiver address
    /// @param _amount the amount to mint
    function mint(address _to, uint256 _amount) external notPaused {
        if (!allowedMinter[_getChainId()][msg.sender]) revert NotAuthorized();
        _mint(_to, _amount);
    }

    /// @notice burns USDO
    /// @param _from address to burn from
    /// @param _amount the amount to burn
    function burn(address _from, uint256 _amount) external notPaused {
        if (!allowedBurner[_getChainId()][msg.sender]) revert NotAuthorized();
        _burn(_from, _amount);
    }

    function addFlashloanFee(uint256 _fee) external {
        if (msg.sender != flashLoanHelper) revert NotAuthorized();
        _fees += _fee;
    }

    // ************************ //
    // *** OWNER FUNCTIONS *** //
    // ************************ //
    function setFlashloanHelper(address _helper) external onlyOwner {
        flashLoanHelper = _helper;
    }

    function extractFees() external onlyOwner {
        if (_fees > 0) {
            uint256 balance = balanceOf(address(this));

            uint256 toExtract = balance >= _fees ? _fees : balance;
            _fees -= toExtract;
            _transfer(address(this), msg.sender, toExtract);
        }
    }
}
