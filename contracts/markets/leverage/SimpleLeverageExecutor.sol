// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {IWETH9} from "tapioca-periph/interfaces/external/weth/IWeth9.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";
import {BaseLeverageExecutor} from "./BaseLeverageExecutor.sol";

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

contract SimpleLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //

    constructor(IZeroXSwapper _swapper, ICluster _cluster) BaseLeverageExecutor(_swapper, _cluster) {}

    // ********************* //
    // *** PUBLIC METHODS *** //
    // ********************* //

    // WETH withdraw receiver.
    receive() external payable {}

    /**
     * @inheritdoc BaseLeverageExecutor
     */
    function getCollateral(
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        bytes calldata swapperData
    ) external payable override returns (uint256 collateralAmountOut) {
        super._getCollateral(assetAddress, collateralAddress, assetAmountIn, swapperData);
        return _swapAndTransferToSender(true, assetAddress, collateralAddress, assetAmountIn, swapperData);
    }

    /**
     * @inheritdoc BaseLeverageExecutor
     */
    function getAsset(
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        bytes calldata swapperData
    ) external override returns (uint256 assetAmountOut) {
        super._getAsset(collateralAddress, assetAddress, collateralAmountIn, swapperData);
        return _swapAndTransferToSender(true, collateralAddress, assetAddress, collateralAmountIn, swapperData);
    }
}
