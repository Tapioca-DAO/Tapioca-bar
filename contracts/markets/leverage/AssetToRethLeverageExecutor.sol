// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ITapiocaOFTBase} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/IBalancerVault.sol";

import "./BaseLeverageExecutor.sol";

//Asset > WETH > trETH through BalancerV2
contract AssetToRethLeverageExecutor is BaseLeverageExecutor {
    using SafeApprove for address;

    address public immutable weth;
    IBalancerVault public vault;
    bytes32 public poolId; //0xade4a71bb62bec25154cfc7e6ff49a513b491e81000000000000000000000497

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
    /// @dev USDO > ETH > wrap to trETH
    /// `data` params needs the following `(uint256, bytes, uint256)`
    ///     - min WETH amount (for swapping Asset to Weth), dexWethData (for swapping Asset to Weth; it can be empty), minREthAmount for swapping WETH with rETH on Balancer V2
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress tETH address (TOFT ETH)
    /// @param assetAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetToRethLeverageExecutor data
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
        (
            uint256 minWethAmount,
            bytes memory dexWEthData,
            uint256 minRethAmount
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
        if (wethAmount < minWethAmount) revert NotEnough(weth);

        //verify rETH
        address rEth = ITapiocaOFTBase(collateralAddress).erc20();
        if (rEth == address(0)) revert TokenNotValid();

        //Swap WETH with rETH on BalancerV2
        weth.safeApprove(address(vault), wethAmount);
        collateralAmountOut = _swap(
            weth,
            rEth,
            wethAmount,
            minRethAmount,
            block.timestamp + 10 minutes
        );

        //wrap and transfer to user
        rEth.safeApprove(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(
            address(this),
            address(this),
            collateralAmountOut
        );

        _ybDeposit(
            collateralId,
            collateralAddress,
            address(this),
            to,
            collateralAmountOut
        );
    }

    /// @notice buys asset with collateral
    /// @dev unwrap trETH > ETH > USDO
    /// `data` params needs the following `(uint256, uint256, bytes)`
    ///     - min WETH amount (for swapping rETH to Weth on Balancer V2), minAssetAmount (for swapping Weth with Asset), dexAssetData (for swapping Weth to Asset; it can be empty)
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress trETH address (TOFT rETH)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param to collateral receiver
    /// @param data AssetToRethLeverageExecutor data
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
        (
            uint256 minWethAmount,
            uint256 minAssetAmount,
            bytes memory dexAssetData
        ) = abi.decode(data, (uint256, uint256, bytes));

        //unwrap trETH
        ITapiocaOFTBase(collateralAddress).unwrap(
            address(this),
            collateralAmountIn
        );

        //verify rETH
        address rEth = ITapiocaOFTBase(collateralAddress).erc20();
        if (rEth == address(0)) revert TokenNotValid();

        //swap rETH with WETH
        uint256 wethAmount = _swap(
            rEth,
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

        _ybDeposit(assetId, assetAddress, address(this), to, assetAmountOut);
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
            tokenIn.safeApprove(address(vault), amount);
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
