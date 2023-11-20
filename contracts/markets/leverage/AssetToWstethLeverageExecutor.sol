// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ITapiocaOFTBase} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/IBalancerVault.sol";

import "./BaseLeverageExecutor.sol";

//Asset > WETH > twstETH through BalancerV2
contract AssetToWstethLeverageExecutor is BaseLeverageExecutor {
    address public immutable weth;
    IBalancerVault public vault;
    bytes32 public poolId; //0x9791d590788598535278552eecd4b211bfc790cb000000000000000000000498

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error SenderNotValid();
    error TokenNotValid();
    error NotEnough(address token);
    error Failed();

    constructor(
        YieldBox _yb,
        ISwapper _swapper,
        ICluster _cluster,
        address _weth,
        address _balancerVault,
        bytes32 _balancerPoolId
    ) BaseLeverageExecutor(_yb, _swapper, _cluster) {
        weth = _weth;
        vault = IBalancerVault(_balancerVault);
        poolId = _balancerPoolId;
    }

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    /// @notice buys collateral with asset
    /// @dev USDO > ETH > wrap to twstETH
    /// `data` params needs the following `(uint256, bytes, uint256)`
    ///     - min WETH amount (for swapping Asset to Weth), dexWethData (for swapping Asset to Weth; it can be empty), minWstethAmount for swapping WETH with wstETH on Balancer V2
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress twstETH address (TOFT wstETH)
    /// @param assetAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetToWstethLeverageExecutor data
    function getCollateral(
        uint256 collateralId,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        address from,
        bytes calldata data
    ) external payable override returns (uint256 collateralAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        _assureSwapperValidity();

        //decode data
        (
            uint256 minWethAmount,
            bytes memory dexWEthData,
            uint256 minWstethAmount
        ) = abi.decode(data, (uint256, bytes, uint256));

        //swap Asset with WETH
        uint256 wethAmount = _swapTokens(
            assetAddress,
            weth,
            assetAmountIn,
            minWethAmount,
            dexWEthData,
            0
        );
        if (wethAmount < minWethAmount) revert NotEnough(assetAddress);

        //verify wstETH
        address wstEth = ITapiocaOFTBase(collateralAddress).erc20();
        if (wstEth == address(0)) revert TokenNotValid();

        //Swap WETH with rETH on BalancerV2
        IERC20(weth).approve(address(vault), 0);
        IERC20(weth).approve(address(vault), wethAmount);
        collateralAmountOut = _swap(
            weth,
            wstEth,
            wethAmount,
            minWstethAmount,
            block.timestamp + 10 minutes
        );

        //wrap and transfer to user
        IERC20(wstEth).approve(collateralAddress, 0);
        IERC20(wstEth).approve(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(
            address(this),
            address(this),
            collateralAmountOut
        );

        IERC20(collateralAddress).approve(address(yieldBox), 0);
        IERC20(collateralAddress).approve(
            address(yieldBox),
            collateralAmountOut
        );
        yieldBox.depositAsset(
            collateralId,
            address(this),
            from,
            collateralAmountOut,
            0
        );
    }

    /// @notice buys asset with collateral
    /// @dev unwrap twstETH > ETH > USDO
    /// `data` params needs the following `(uint256, uint256, bytes)`
    ///     - min WETH amount (for swapping wstETH to Weth on Balancer V2), minAssetAmount (for swapping Weth with Asset), dexAssetData (for swapping Weth to Asset; it can be empty)
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress twstETH address (TOFT wstETH)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetToWstethLeverageExecutor data
    function getAsset(
        uint256 assetId,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        address from,
        bytes calldata data
    ) external override returns (uint256 assetAmountOut) {
        if (!cluster.isWhitelisted(0, msg.sender)) revert SenderNotValid();
        _assureSwapperValidity();

        //decode data
        (
            uint256 minWethAmount,
            uint256 minAssetAmount,
            bytes memory dexAssetData
        ) = abi.decode(data, (uint256, uint256, bytes));

        //unwrap twsETH
        ITapiocaOFTBase(collateralAddress).unwrap(
            address(this),
            collateralAmountIn
        );

        //verify rETH
        address wstEth = ITapiocaOFTBase(collateralAddress).erc20();
        if (wstEth == address(0)) revert TokenNotValid();

        //swap rETH with WETH
        uint256 wethAmount = _swap(
            wstEth,
            weth,
            collateralAmountIn,
            minWethAmount,
            block.timestamp + 10 minutes
        );

        //swap WETH with Asset
        assetAmountOut = _swapTokens(
            weth,
            assetAddress,
            wethAmount,
            minAssetAmount,
            dexAssetData,
            0
        );
        if (assetAmountOut < minAssetAmount) revert NotEnough(assetAddress);

        IERC20(assetAddress).approve(address(yieldBox), 0);
        IERC20(assetAddress).approve(address(yieldBox), assetAmountOut);
        yieldBox.depositAsset(assetId, address(this), from, assetAmountOut, 0);
    }

    receive() external payable {}

    // ********************** //
    // *** PRIVATE MEHODS *** //
    // ********************** //
    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minAmountOut,
        uint256 deadline
    ) private returns (uint256 collateralAmountOut) {
        IBalancerVault.FundManagement memory fundManagement = IBalancerVault
            .FundManagement({
                sender: address(this),
                fromInternalBalance: false,
                recipient: payable(this),
                toInternalBalance: false
            });
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault
            .SingleSwap({
                poolId: poolId,
                kind: IBalancerVault.SwapKind.GIVEN_IN,
                assetIn: IAsset(tokenIn),
                assetOut: IAsset(tokenOut),
                amount: amount,
                userData: "0x"
            });

        if (tokenIn != address(0)) {
            IERC20(tokenIn).approve(address(vault), 0);
            IERC20(tokenIn).approve(address(vault), amount);
        }
        collateralAmountOut = vault.swap(
            singleSwap,
            fundManagement,
            minAmountOut,
            deadline
        );
        if (collateralAmountOut < minAmountOut) revert Failed();
    }
}
