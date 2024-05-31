// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {IWeth9} from "tapioca-periph/interfaces/external/weth/IWeth9.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BaseLeverageExecutor} from "./BaseLeverageExecutor.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract SimpleLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //

    constructor(IZeroXSwapper _swapper, ICluster _cluster, address _weth)
        BaseLeverageExecutor(_swapper, _cluster, _weth)
    {}

    // ********************* //
    // *** PUBLIC METHODS *** //
    // ********************* //

    /**
     * @inheritdoc BaseLeverageExecutor
     */
    function getCollateral(
        address refundDustAddress,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        bytes calldata swapperData
    ) external payable override returns (uint256 collateralAmountOut) {
        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        return _swapAndTransferToSender(
            refundDustAddress, true, assetAddress, collateralAddress, assetAmountIn, swapperData
        );
    }

    /**
     * @inheritdoc BaseLeverageExecutor
     */
    function getAsset(
        address refundDustAddress,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        bytes calldata swapperData
    ) external override returns (uint256 assetAmountOut) {
        // Should be called only by approved SGL/BB markets.
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        return _swapAndTransferToSender(
            refundDustAddress, true, collateralAddress, assetAddress, collateralAmountIn, swapperData
        );
    }
}
