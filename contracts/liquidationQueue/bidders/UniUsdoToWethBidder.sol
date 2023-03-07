// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";

import "../../interfaces/IPenrose.sol";
import "../ILiquidationQueue.sol";
import "../../swappers/ISwapper.sol";
import "../../singularity/interfaces/ISingularity.sol";
import "../../../yieldbox/contracts/interfaces/IYieldBox.sol";

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

/// @title Swaps USD0 to WETH UniswapV2
/// @dev Performs 1 swap operation:
///     - USD0 to Weth through UniV2
contract UniUsdoToWethBidder is BoringOwnable {
    // ************ //
    // *** VARS *** //
    // ************ //

    /// @notice UniswapV2 swapper
    ISwapper public univ2Swapper;

    /// @notice YieldBox WETH asset id
    uint256 wethId;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event UniV2SwapperUpdated(address indexed _old, address indexed _new);

    /// @notice Creates a new UniUsdoToWethBidder contract
    /// @param uniV2Swapper_ UniswapV2 swapper address
    /// @param _wethAssetId YieldBox WETH asset id
    constructor(ISwapper uniV2Swapper_, uint256 _wethAssetId) {
        univ2Swapper = uniV2Swapper_;
        wethId = _wethAssetId;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns the unique name
    function name() external pure returns (string memory) {
        return "USD0 -> WETH (Uniswap V2)";
    }

    /// @notice returns token tokenIn amount based on tokenOut amount
    /// @param tokenInId Token in asset id
    /// @param amountOut Token out amount
    function getInputAmount(
        ISingularity singularity,
        uint256 tokenInId,
        uint256 amountOut,
        bytes calldata
    ) external view returns (uint256) {
        require(
            tokenInId == IPenrose(singularity.penrose()).usdoAssetId(),
            "token not valid"
        );
        IYieldBox yieldBox = IYieldBox(singularity.yieldBox());

        uint256 shareOut = yieldBox.toShare(wethId, amountOut, false);

        (, address tokenInAddress, , ) = yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = yieldBox.assets(wethId);

        address[] memory path = new address[](2);
        path[0] = tokenInAddress;
        path[1] = tokenOutAddress;

        return univ2Swapper.getInputAmount(wethId, shareOut, abi.encode(path));
    }

    /// @notice returns the amount of collateral
    /// @param amountIn Stablecoin amount
    function getOutputAmount(
        ISingularity singularity,
        uint256 tokenInId,
        uint256 amountIn,
        bytes calldata
    ) external view returns (uint256) {
        require(
            IPenrose(singularity.penrose()).usdoToken() != address(0),
            "USD0 not set"
        );
        uint256 usdoAssetId = IPenrose(singularity.penrose()).usdoAssetId();
        require(tokenInId == usdoAssetId, "token not valid");

        return
            _uniswapOutputAmount(
                IYieldBox(singularity.yieldBox()),
                usdoAssetId,
                wethId,
                amountIn
            );
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice swaps stable to collateral
    /// @param tokenInId Token in asset Id
    /// @param amountIn Stablecoin amount
    /// @param data extra data used for the swap operation
    function swap(
        ISingularity singularity,
        uint256 tokenInId,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256) {
        require(
            IPenrose(singularity.penrose()).usdoToken() != address(0),
            "USD0 not set"
        );
        IYieldBox yieldBox = IYieldBox(singularity.yieldBox());
        ILiquidationQueue liquidationQueue = ILiquidationQueue(
            singularity.liquidationQueue()
        );

        uint256 usdoAssetId = IPenrose(singularity.penrose()).usdoAssetId();
        require(tokenInId == usdoAssetId, "token not valid");
        require(msg.sender == address(liquidationQueue), "only LQ");

        uint256 assetMin = 0;
        if (data.length > 0) {
            //should always be sent
            assetMin = abi.decode(data, (uint256));
        }

        yieldBox.transfer(
            address(this),
            address(univ2Swapper),
            tokenInId,
            yieldBox.toShare(tokenInId, amountIn, false)
        );

        return
            _uniswapSwap(
                yieldBox,
                usdoAssetId,
                wethId,
                amountIn,
                assetMin,
                address(liquidationQueue)
            );
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice sets the UniV2 swapper
    /// @dev used for WETH to USDC swap
    /// @param _swapper The UniV2 pool swapper address
    function setUniswapSwapper(ISwapper _swapper) external onlyOwner {
        emit UniV2SwapperUpdated(address(univ2Swapper), address(_swapper));
        univ2Swapper = _swapper;
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _uniswapSwap(
        IYieldBox yieldBox,
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 tokenInAmount,
        uint256 minAmount,
        address to
    ) private returns (uint256) {
        (, address tokenInAddress, , ) = yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = yieldBox.assets(tokenOutId);
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenInAddress;
        swapPath[1] = tokenOutAddress;
        uint256 tokenInShare = yieldBox.toShare(
            tokenInId,
            tokenInAmount,
            false
        );
        (uint256 outAmount, ) = univ2Swapper.swap(
            tokenInId,
            tokenOutId,
            tokenInShare,
            to,
            minAmount,
            abi.encode(swapPath)
        );

        return outAmount;
    }

    function _uniswapOutputAmount(
        IYieldBox yieldBox,
        uint256 tokenInId,
        uint256 tokenOutId,
        uint256 amountIn
    ) private view returns (uint256) {
        (, address tokenInAddress, , ) = yieldBox.assets(tokenInId);
        (, address tokenOutAddress, , ) = yieldBox.assets(tokenOutId);
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenInAddress;
        swapPath[1] = tokenOutAddress;
        uint256 tokenInShare = yieldBox.toShare(tokenInId, amountIn, false);
        return
            univ2Swapper.getOutputAmount(
                tokenInId,
                tokenInShare,
                abi.encode(swapPath)
            );
    }
}
