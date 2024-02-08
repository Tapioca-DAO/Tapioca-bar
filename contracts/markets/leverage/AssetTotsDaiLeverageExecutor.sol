// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ISavingsDai} from "tapioca-periph/interfaces/external/makerdao/ISavingsDai.sol";
import {ITapiocaOFTBase} from "tapioca-periph/interfaces/tap-token/ITapiocaOFT.sol";
import {BaseLeverageExecutor, SLeverageSwapData} from "./BaseLeverageExecutor.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";

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

contract AssetTotsDaiLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;
    // ************** //
    // *** ERRORS *** //
    // ************** //

    error MinAmountNotValid(uint256 expected, uint256 received);
    error NotEnough(address token);
    error SenderNotValid();
    error TokenNotValid();

    constructor(IZeroXSwapper _swapper, ICluster _cluster) BaseLeverageExecutor(_swapper, _cluster) {}

    // ********************* //
    // *** PUBLIC METHODS *** //
    // ********************* //

    /**
     * @dev USDO > DAI > sDAi > wrap to tsDai
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false
     * @inheritdoc BaseLeverageExecutor
     */
    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        bytes calldata data
    ) external payable override returns (uint256 collateralAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();

        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(collateralAddress);

        //swap USDO (asset) with DAI
        SLeverageSwapData memory swapData = abi.decode(data, (SLeverageSwapData));
        uint256 daiAmount = _swapAndTransferToSender(false, assetAddress, daiAddress, assetAmountIn, swapData, 0);

        //obtain sDai
        daiAddress.safeApprove(sDaiAddress, daiAmount);
        collateralAmountOut = ISavingsDai(sDaiAddress).deposit(daiAmount, address(this));

        // Wrap into tsDai to sender
        sDaiAddress.safeApprove(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(address(this), msg.sender, collateralAmountOut);
        sDaiAddress.safeApprove(collateralAddress, 0);
    }

    /**
     * @dev unwrap tsDai > withdraw sDai > Dai > USDO
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false
     * @inheritdoc BaseLeverageExecutor
     */
    function getAsset(address collateralAddress, address assetAddress, uint256 collateralAmountIn, bytes calldata data)
        external
        override
        returns (uint256 assetAmountOut)
    {
        super._getAsset(collateralAddress, assetAddress, collateralAmountIn, data);

        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(collateralAddress);
        //unwrap tsDai
        ITapiocaOFTBase(collateralAddress).unwrap(address(this), collateralAmountIn);
        //redeem from sDai
        uint256 obtainedDai = ISavingsDai(sDaiAddress).redeem(
            ISavingsDai(sDaiAddress).convertToShares(collateralAmountIn), address(this), address(this)
        );
        // swap DAI with USDO
        SLeverageSwapData memory swapData = abi.decode(data, (SLeverageSwapData));
        assetAmountOut = _swapAndTransferToSender(false, daiAddress, assetAddress, obtainedDai, swapData);

        // Send back the remaining USDO
        assetAddress.safeTransfer(msg.sender, assetAmountOut);
    }

    // ********************** //
    // *** PRIVATE METHODS *** //
    // ********************** //

    function _getAddresses(address collateralAddress) private view returns (address sDaiAddress, address daiAddress) {
        //retrieve sDAI address from tsDai
        sDaiAddress = ITapiocaOFTBase(collateralAddress).erc20();
        if (sDaiAddress == address(0)) revert TokenNotValid();

        //retrieve DAI address from sDAI
        daiAddress = ISavingsDai(sDaiAddress).dai();
    }
}
