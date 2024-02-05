// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// Tapioca
import {IBalancerVault, IBalancerAsset} from "tapioca-periph/interfaces/external/balancer/IBalancerVault.sol";
import {ITapiocaOFTBase} from "tapioca-periph/interfaces/tap-token/ITapiocaOFT.sol";
import {ISwapper} from "tapioca-periph/interfaces/periph/ISwapper.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";
import {BaseLeverageExecutor} from "./BaseLeverageExecutor.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";

//Asset > WETH > twstETH through BalancerV2
contract AssetToWstethLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

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
        IYieldBox _yb,
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
    /// @param to collateral receiver
    /// @param data AssetToWstethLeverageExecutor data
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

        //decode data
        (uint256 minWethAmount, bytes memory dexWEthData, uint256 minWstethAmount) =
            abi.decode(data, (uint256, bytes, uint256));

        //swap Asset with WETH
        uint256 wethAmount = _swapTokens(assetAddress, weth, assetAmountIn, minWethAmount, dexWEthData, 0);
        if (wethAmount < minWethAmount) revert NotEnough(assetAddress);

        //verify wstETH
        address wstEth = ITapiocaOFTBase(collateralAddress).erc20();
        if (wstEth == address(0)) revert TokenNotValid();

        //Swap WETH with rETH on BalancerV2
        weth.safeApprove(address(vault), wethAmount);
        collateralAmountOut = _swap(weth, wstEth, wethAmount, minWstethAmount, block.timestamp + 10 minutes);

        //wrap and transfer to user
        wstEth.safeApprove(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(address(this), address(this), collateralAmountOut);

        _ybDeposit(collateralId, collateralAddress, address(this), to, collateralAmountOut);
    }

    /// @notice buys asset with collateral
    /// @dev unwrap twstETH > ETH > USDO
    /// `data` params needs the following `(uint256, uint256, bytes)`
    ///     - min WETH amount (for swapping wstETH to Weth on Balancer V2), minAssetAmount (for swapping Weth with Asset), dexAssetData (for swapping Weth to Asset; it can be empty)
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress twstETH address (TOFT wstETH)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetToWstethLeverageExecutor data
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

        //decode data
        (uint256 minWethAmount, uint256 minAssetAmount, bytes memory dexAssetData) =
            abi.decode(data, (uint256, uint256, bytes));

        //unwrap twsETH
        ITapiocaOFTBase(collateralAddress).unwrap(address(this), collateralAmountIn);

        //verify rETH
        address wstEth = ITapiocaOFTBase(collateralAddress).erc20();
        if (wstEth == address(0)) revert TokenNotValid();

        //swap rETH with WETH
        uint256 wethAmount = _swap(wstEth, weth, collateralAmountIn, minWethAmount, block.timestamp + 10 minutes);

        //swap WETH with Asset
        assetAmountOut = _swapTokens(weth, assetAddress, wethAmount, minAssetAmount, dexAssetData, 0);
        if (assetAmountOut < minAssetAmount) revert NotEnough(assetAddress);

        _ybDeposit(assetId, assetAddress, address(this), to, assetAmountOut);
    }

    receive() external payable {}

    // ********************** //
    // *** PRIVATE MEHODS *** //
    // ********************** //
    function _swap(address tokenIn, address tokenOut, uint256 amount, uint256 minAmountOut, uint256 deadline)
        private
        returns (uint256 collateralAmountOut)
    {
        IBalancerVault.FundManagement memory fundManagement = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(this),
            toInternalBalance: false
        });
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: IBalancerAsset(tokenIn),
            assetOut: IBalancerAsset(tokenOut),
            amount: amount,
            userData: "0x"
        });

        if (tokenIn != address(0)) {
            tokenIn.safeApprove(address(vault), amount);
        }
        collateralAmountOut = vault.swap(singleSwap, fundManagement, minAmountOut, deadline);
        if (collateralAmountOut < minAmountOut) revert Failed();
    }
}
