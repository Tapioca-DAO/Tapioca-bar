// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ISavingsDai} from "tapioca-periph/interfaces/external/makerdao/ISavingsDai.sol";
import {ITapiocaOFTBase} from "tapioca-periph/interfaces/tap-token/ITapiocaOFT.sol";
import {ISwapper} from "tapioca-periph/interfaces/periph/ISwapper.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";
import {BaseLeverageExecutor} from "./BaseLeverageExecutor.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";

contract AssetTotsDaiLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;
    // ************** //
    // *** ERRORS *** //
    // ************** //

    error SenderNotValid();
    error TokenNotValid();
    error NotEnough(address token);

    constructor(IYieldBox _yb, ISwapper _swapper, ICluster _cluster) BaseLeverageExecutor(_yb, _swapper, _cluster) {}

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    /// @notice buys collateral with asset
    /// @dev USDO > DAI > sDAi > wrap to tsDai
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress tsDai address (TOFT sDAI)
    /// @param assetAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetTotsDaiLeverageExecutor data
    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address to,
        bytes calldata data
    ) external payable override returns (uint256 collateralAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        _assureSwapperValidity();
        (uint256 minAmountOut, bytes memory dexData) = abi.decode(data, (uint256, bytes));
        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(collateralAddress);
        //swap USDO (asset) with DAI
        uint256 daiAmount = _swapTokens(assetAddress, daiAddress, assetAmountIn, minAmountOut, dexData, 0);
        if (daiAmount < minAmountOut) revert NotEnough(daiAddress);
        //obtain sDai
        daiAddress.safeApprove(sDaiAddress, daiAmount);
        collateralAmountOut = ISavingsDai(sDaiAddress).deposit(daiAmount, address(this));
        //wrap into tsDai
        _wrap(sDaiAddress, collateralAddress, collateralAmountOut);

        //deposit tsDai to YieldBox
        _ybDeposit(collateralId, collateralAddress, address(this), to, collateralAmountOut);
    }

    /// @notice buys asset with collateral
    /// @dev unwrap tsDai > withdraw sDai > Dai > USDO
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress tsDai address (TOFT sDAI)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetTotsDaiLeverageExecutor data
    function getAsset(
        uint256 assetId,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        address to,
        bytes calldata data
    ) external override returns (uint256 assetAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        _assureSwapperValidity();
        (uint256 minAmountOut, bytes memory dexData) = abi.decode(data, (uint256, bytes));
        //retrieve addresses
        (address sDaiAddress, address daiAddress) = _getAddresses(collateralAddress);
        //unwrap tsDai
        ITapiocaOFTBase(collateralAddress).unwrap(address(this), collateralAmountIn);
        //redeem from sDai
        uint256 obtainedDai = ISavingsDai(sDaiAddress).redeem(
            ISavingsDai(sDaiAddress).convertToShares(collateralAmountIn), address(this), address(this)
        );
        assetAmountOut = _swapTokens(daiAddress, assetAddress, obtainedDai, minAmountOut, dexData, 0);
        if (assetAmountOut < minAmountOut) revert NotEnough(assetAddress);

        _ybDeposit(assetId, assetAddress, address(this), to, assetAmountOut);
    }

    // ********************** //
    // *** PRIVATE MEHODS *** //
    // ********************** //
    function _wrap(address sDaiAddress, address collateralAddress, uint256 collateralAmountOut) private {
        sDaiAddress.safeApprove(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(address(this), address(this), collateralAmountOut);
    }

    function _getAddresses(address collateralAddress) private view returns (address sDaiAddress, address daiAddress) {
        //retrieve sDAI address from tsDai
        sDaiAddress = ITapiocaOFTBase(collateralAddress).erc20();
        if (sDaiAddress == address(0)) revert TokenNotValid();

        //retrieve DAI address from sDAI
        daiAddress = ISavingsDai(sDaiAddress).dai();
    }
}
