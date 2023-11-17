// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//interfaces
import {ITapiocaOFTBase} from "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/IGmxExchangeRouter.sol";

import "./BaseLeverageExecutor.sol";

contract AssetToGmxEthUsdcLpLeverageExecutor is BaseLeverageExecutor {
    IERC20 public immutable usdc; //0xaf88d065e77c8cC2239327C5EDb3A432268e5831
    IERC20 public immutable weth; //0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
    address public immutable gmMarket; //0x70d95587d40A2caf56bd97485aB3Eec10Bee6336
    address public immutable router; //0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6
    IGmxExchangeRouter public immutable exchangeRouter; //0x7c68c7866a64fa2160f78eeae12217ffbf871fa8
    address public immutable withdrawalVault; //0x0628d46b5d145f183adb6ef1f2c97ed1c4701c55
    address public immutable depositVault; //0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55

    uint256 public constant FEE = 748000000000000;

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
        IERC20 _usdc,
        IERC20 _weth,
        address _router,
        IGmxExchangeRouter _exchangeRouter,
        address _gmMarket,
        address _withdrawalVault,
        address _depositVault
    ) BaseLeverageExecutor(_yb, _swapper, _cluster) {
        usdc = _usdc;
        weth = _weth;
        router = _router;
        exchangeRouter = _exchangeRouter;
        gmMarket = _gmMarket;
        withdrawalVault = _withdrawalVault;
        depositVault = _depositVault;
    }

    // ********************* //
    // *** PUBLIC MEHODS *** //
    // ********************* //
    /// @notice buys collateral with asset
    /// @dev USDO > USDC > GMX-ETH-USDC LP > wrap
    /// 'data' param needs the following `(uint256, bytes, uint256)`
    ///      - min USDC amount (for swapping Asset with USDC), dexUsdcData (for swapping Asset with USDC; it can be empty), lpMinAmountOut (GM LP minimum amout to obtain when staking USDC)
    ///      - lpMinAmountOut can be obtained by querying `gmMarket`
    /// @param collateralId Collateral's YieldBox id
    /// @param assetAddress usually USDO address
    /// @param collateralAddress tLP address (TOFT GMX-ETH-USDC LP)
    /// @param assetAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetToGmxEthUsdcLpLeverageExecutor data
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
            uint256 minUsdcAmountOut,
            bytes memory dexUsdcData,
            uint256 lpMinAmountOut
        ) = abi.decode(data, (uint256, bytes, uint256));

        //swap Asset with USDC
        uint256 usdcAmount = _swapTokens(
            assetAddress,
            address(usdc),
            assetAmountIn,
            minUsdcAmountOut,
            dexUsdcData,
            0
        );
        if (usdcAmount < minUsdcAmountOut) revert NotEnough(address(usdc));

        //get GMX-ETH-USDC LP address
        address lpAddress = ITapiocaOFTBase(collateralAddress).erc20();
        if (lpAddress == address(0)) revert TokenNotValid();

        //stake USDC and get GMX-ETH-USDC LP
        collateralAmountOut = _stakeUsdc(
            usdcAmount,
            lpMinAmountOut,
            address(weth),
            address(usdc),
            lpAddress
        );

        //wrap into tLP
        IERC20(lpAddress).approve(collateralAddress, 0);
        IERC20(lpAddress).approve(collateralAddress, collateralAmountOut);
        ITapiocaOFTBase(collateralAddress).wrap(
            address(this),
            address(this),
            collateralAmountOut
        );

        //deposit tGLP to YieldBox
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
    /// @dev unwrap tLP > USDC > Asset
    /// `data` param needs the following `(uint256, bytes, uint256, uint256, uint256)`
    ///     - minAssetAmountOut & dexAssetData (for swapping USDC to Asset)
    ///     - minWethAmount & minUsdcAmount (for unstaking GM LP; it can be queried )
    ///     - minWethToUsdcAmount & dexWethToUsdcData (for swapping WETH to USDC)
    /// @param assetId Asset's YieldBox id; usually USDO asset id
    /// @param collateralAddress tLP address (TOFT GMX-ETH-USDC LP)
    /// @param assetAddress usually USDO address
    /// @param collateralAmountIn amount to swap
    /// @param from collateral receiver
    /// @param data AssetToGmxEthUsdcLpLeverageExecutor data
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
            uint256 minAssetAmountOut,
            bytes memory dexAssetData,
            uint256 minWethAmount,
            uint256 minUsdcAmount,
            uint256 minWethToUsdcAmount,
            bytes memory dexWethToUsdcData
        ) = abi.decode(
                data,
                (uint256, bytes, uint256, uint256, uint256, bytes)
            );

        address lpAddress = ITapiocaOFTBase(collateralAddress).erc20();
        if (lpAddress == address(0)) revert TokenNotValid();

        ITapiocaOFTBase(collateralAddress).unwrap(
            address(this),
            collateralAmountIn
        );

        //unstake GMX-ETH-USDC LP and get USDC
        (uint256 usdcAmount, uint256 wethAmount) = _unstakeLp(
            collateralAmountIn,
            lpAddress,
            minWethAmount,
            minUsdcAmount
        );

        //swap WETH with USDC
        uint256 obtainedUsdc = _swapTokens(
            address(weth),
            address(usdc),
            wethAmount,
            minWethToUsdcAmount,
            dexWethToUsdcData,
            0
        );

        //swap USDC with Asset
        assetAmountOut = _swapTokens(
            address(usdc),
            assetAddress,
            usdcAmount + obtainedUsdc,
            minAssetAmountOut,
            dexAssetData,
            0
        );
        if (assetAmountOut < minAssetAmountOut) revert NotEnough(assetAddress);

        IERC20(assetAddress).approve(address(yieldBox), 0);
        IERC20(assetAddress).approve(address(yieldBox), assetAmountOut);
        yieldBox.depositAsset(assetId, address(this), from, assetAmountOut, 0);
    }

    // ********************** //
    // *** PRIVATE MEHODS *** //
    // ********************** //
    /// @dev add liquidity to GMX market
    function _stakeUsdc(
        uint256 usdcAmount,
        uint256 lpMinAmount,
        address longToken,
        address shortToken,
        address lp
    ) private returns (uint256 collateralAmountOut) {
        bytes[] memory data = new bytes[](3);

        //create sendWnt
        data[0] = abi.encodeWithSelector(
            IGmxExchangeRouter.sendWnt.selector,
            depositVault,
            1e18 //TODO: compute
        );

        //create sendTokens
        data[1] = abi.encodeWithSelector(
            IGmxExchangeRouter.sendTokens.selector,
            usdc,
            depositVault,
            usdcAmount
        );

        //create createDeposit
        address[] memory emptyPath = new address[](0);
        IGmxExchangeRouter.CreateDepositParams
            memory createDepositParams = IGmxExchangeRouter
                .CreateDepositParams({
                    receiver: address(this),
                    callbackContract: address(0),
                    uiFeeReceiver: address(0),
                    market: gmMarket,
                    initialLongToken: longToken,
                    initialShortToken: shortToken,
                    longTokenSwapPath: emptyPath,
                    shortTokenSwapPath: emptyPath,
                    minMarketTokens: lpMinAmount,
                    shouldUnwrapNativeToken: false,
                    executionFee: 1e18, //TODO: compute
                    callbackGasLimit: 0
                });
        data[2] = abi.encodeWithSelector(
            IGmxExchangeRouter.createDeposit.selector,
            createDepositParams
        );

        //execute multicall
        uint256 lpBalanceBefore = IERC20(lp).balanceOf(address(this));
        usdc.approve(router, 0);
        usdc.approve(router, usdcAmount);
        exchangeRouter.multicall{value: msg.value}(data);
        collateralAmountOut =
            IERC20(lp).balanceOf(address(this)) -
            lpBalanceBefore;
        if (collateralAmountOut == 0) revert Failed();
    }

    /// @dev remove liquidity from GMX market
    ///     - it will return both USDC and WETH
    function _unstakeLp(
        uint256 lpAmount,
        address lpAddress,
        uint256 minWethAmount,
        uint256 minUsdcAmount
    ) private returns (uint256 usdcAmount, uint256 wethAmount) {
        bytes[] memory data = new bytes[](3);

        //create sendWnt
        data[0] = abi.encodeWithSelector(
            IGmxExchangeRouter.sendWnt.selector,
            withdrawalVault,
            FEE //this seems to be hardcoded
        );

        //create sendTokens
        data[1] = abi.encodeWithSelector(
            IGmxExchangeRouter.sendTokens.selector,
            lpAddress,
            withdrawalVault,
            lpAmount
        );

        //create createWithdrawal
        address[] memory emptyPath = new address[](0);
        IGmxExchangeRouter.CreateWithdrawalParams
            memory createWithdrawalParams = IGmxExchangeRouter
                .CreateWithdrawalParams({
                    receiver: address(this),
                    callbackContract: address(0),
                    uiFeeReceiver: address(0),
                    market: gmMarket,
                    longTokenSwapPath: emptyPath,
                    shortTokenSwapPath: emptyPath,
                    minLongTokenAmount: minWethAmount,
                    minShortTokenAmount: minUsdcAmount,
                    shouldUnwrapNativeToken: true,
                    executionFee: FEE, //this seems to be hardcoded
                    callbackGasLimit: 0
                });
        data[2] = abi.encodeWithSelector(
            IGmxExchangeRouter.createWithdrawal.selector,
            createWithdrawalParams
        );

        //execute multicall
        IERC20(lpAddress).approve(router, 0);
        IERC20(lpAddress).approve(router, lpAmount);

        uint256 usdcBalanceBefore = usdc.balanceOf(address(this));
        uint256 wethBalanceBefore = weth.balanceOf(address(this));
        exchangeRouter.multicall(data);
        usdcAmount = usdc.balanceOf(address(this)) - usdcBalanceBefore;
        wethAmount = weth.balanceOf(address(this)) - wethBalanceBefore;
    }
}
