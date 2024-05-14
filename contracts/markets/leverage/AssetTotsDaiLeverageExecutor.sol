// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

//interfaces
import {ISavingsDai} from "tapioca-periph/interfaces/external/makerdao/ISavingsDai.sol";
import {BaseLeverageExecutor, SLeverageSwapData} from "./BaseLeverageExecutor.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {ITOFT} from "tapioca-periph/interfaces/oft/ITOFT.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract AssetTotsDaiLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

    constructor(IZeroXSwapper _swapper, ICluster _cluster, address _weth)
        BaseLeverageExecutor(_swapper, _cluster, _weth)
    {}

    // ********************* //
    // *** PUBLIC METHODS *** //
    // ********************* //

    /**
     * @dev USDO > DAI > sDAi > wrap to tsDai
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false. Does the unwrapping internally.
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false. Does the wrapping internally.
     * @inheritdoc BaseLeverageExecutor
     */
    function getCollateral(address refundDustAddress, address assetAddress, address collateralAddress, uint256 assetAmountIn, bytes calldata data)
        external
        payable
        override
        returns (uint256 collateralAmountOut)
    {
        if (msg.value > 0) revert NativeNotSupported();

        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();

        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(collateralAddress);

        //swap USDO (asset) with DAI
        uint256 daiAmount = _swapAndTransferToSender(refundDustAddress, false, assetAddress, daiAddress, assetAmountIn, data);

        //obtain sDai
        daiAddress.safeApprove(sDaiAddress, daiAmount);
        collateralAmountOut = ISavingsDai(sDaiAddress).deposit(daiAmount, address(this));

        //re-check minAmount to verify the DAI<>sDAI ratio
        SLeverageSwapData memory swapData = abi.decode(data, (SLeverageSwapData));
        if (collateralAmountOut < swapData.minAmountOut) revert MinAmountNotValid(swapData.minAmountOut, collateralAmountOut);

        // Wrap into tsDai to sender
        sDaiAddress.safeApprove(collateralAddress, collateralAmountOut);
        collateralAmountOut = ITOFT(collateralAddress).wrap(address(this), msg.sender, collateralAmountOut);
        sDaiAddress.safeApprove(collateralAddress, 0);
    }

    /**
     * @dev unwrap tsDai > withdraw sDai > Dai > USDO
     * @dev Expects SLeverageSwapData.toftInfo.isTokenInToft to be false. Does the unwrapping internally.
     * @dev Expects SLeverageSwapData.toftInfo.isTokenOutToft to be false. Does the wrapping internally.
     * @inheritdoc BaseLeverageExecutor
     */
    function getAsset(address refundDustAddress, address collateralAddress, address assetAddress, uint256 collateralAmountIn, bytes calldata data)
        external
        override
        returns (uint256 assetAmountOut)
    {
        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();

        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(collateralAddress);
        //unwrap tsDai
        uint256 unwrapped = ITOFT(collateralAddress).unwrap(address(this), collateralAmountIn);
        //redeem from sDai
        uint256 obtainedDai = ISavingsDai(sDaiAddress).redeem(unwrapped, address(this), address(this));
        // swap DAI with USDO, and transfer to sender
        // If sendBack true and swapData.swapperData.toftInfo.isTokenOutToft false
        // The asset will be transfer via IERC20 transfer.
        assetAmountOut = _swapAndTransferToSender(refundDustAddress, true, daiAddress, assetAddress, obtainedDai, data);
    }

    // ********************** //
    // *** PRIVATE METHODS *** //
    // ********************** //

    /**
     * @dev retrieve sDai and Dai addresses from tsDai
     */
    function _getAddresses(address collateralAddress) private view returns (address sDaiAddress, address daiAddress) {
        //retrieve sDAI address from tsDai
        sDaiAddress = ITOFT(collateralAddress).erc20();
        if (sDaiAddress == address(0)) revert TokenNotValid();

        //retrieve DAI address from sDAI
        daiAddress = ISavingsDai(sDaiAddress).dai();
    }
}
