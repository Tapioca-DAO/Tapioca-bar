// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";
import {IWeth9} from "tapioca-periph/interfaces/external/weth/IWeth9.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
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

struct SToftInfo {
    bool isTokenInToft;
    bool isTokenOutToft;
}

struct SLeverageSwapData {
    uint256 minAmountOut;
    SToftInfo toftInfo;
    bytes swapperData;
}

abstract contract BaseLeverageExecutor is Ownable {
    using SafeApprove for address;
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    // ************ //
    // *** VARS *** //
    // ************ //

    IZeroXSwapper public swapper;
    IPearlmit public pearlmit;
    ICluster public cluster;
    IWeth9 public weth;

    event AddressUpdated(address indexed oldAddr, address indexed newAddr);
    event ConservatorUpdated(address indexed old, address indexed _new);

    // ************** //
    // *** ERRORS *** //
    // ************** //

    error MinAmountNotValid(uint256 expected, uint256 received);
    error SwapperNotAuthorized();
    error SwapperNotValid();
    error SenderNotValid();
    error TokenNotValid();
    error NativeNotSupported();
    error AddressNotValid();
    error NotAuthorized();

    constructor(IZeroXSwapper _swapper, ICluster _cluster, address _weth, IPearlmit _pearlmit) {
        if (address(_cluster) == address(0)) revert AddressNotValid();
        swapper = _swapper;
        cluster = _cluster;
        weth = IWeth9(_weth);
        pearlmit = _pearlmit;
    }

    receive() external payable {}

    // ******************** //
    // *** OWNER METHODS *** //
    // ******************** //
    /**
     * @notice Sets the WETH address
     */
    function setWeth(address _weth) external onlyOwner {
        emit AddressUpdated(address(weth), _weth);
        weth = IWeth9(_weth);
    }

    /// @notice sets swapper
    /// @param _swapper the new IZeroXSwapper
    function setSwapper(IZeroXSwapper _swapper) external onlyOwner {
        emit AddressUpdated(address(swapper), address(_swapper));
        swapper = _swapper;
    }

    /// @notice sets cluster
    /// @param _cluster the new ICluster
    function setCluster(ICluster _cluster) external onlyOwner {
        emit AddressUpdated(address(cluster), address(_cluster));
        cluster = _cluster;
    }

    // ********************* //
    // *** PUBLIC METHODS *** //
    // ********************* //

    /**
     * @notice Buys an asked amount of collateral with an asset using the ZeroXSwapper.
     * @dev Expects the token to be already transferred to this contract.
     * @param refundDustAddress original caller.
     * @param assetAddress asset address.
     * @param collateralAddress collateral address.
     * @param assetAmountIn amount to swap.
     * @param data SLeverageSwapData.
     */
    function getCollateral(
        address refundDustAddress,
        address assetAddress,
        address collateralAddress,
        uint256 assetAmountIn,
        bytes calldata data
    ) external payable virtual returns (uint256 collateralAmountOut) {}

    /**
     * @notice Buys an asked amount of asset with a collateral using the ZeroXSwapper.
     * @dev Expects the token to be already transferred to this contract.
     * @param refundDustAddress original caller.
     * @param collateralAddress collateral address.
     * @param assetAddress asset address.
     * @param collateralAmountIn amount to swap.
     * @param data SLeverageSwapData.
     */
    function getAsset(
        address refundDustAddress,
        address collateralAddress,
        address assetAddress,
        uint256 collateralAmountIn,
        bytes calldata data
    ) external virtual returns (uint256 assetAmountOut) {}

    // *********************** //
    // *** INTERNAL METHODS *** //
    // *********************** //

    /**
     * @notice Sell `tokenIn` and buy `tokenOut`.
     * @dev Sends the `amountOut` of `tokenOut` to the sender if `sendBack` is true, by wrapping or transferring it.
     *
     * @param tokenIn token to swap. Can be tOFT.
     * @param tokenOut token to receive. Can be tOFT.
     * @param amountIn amount to swap.
     * @param data SLeverageSwapData.
     */
    function _swapAndTransferToSender(
        address from,
        bool sendBack,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory data
    ) internal returns (uint256 amountOut) {
        SLeverageSwapData memory swapData = abi.decode(data, (SLeverageSwapData));
        address toftTokenOut = tokenOut; // Used later to wrap and send back after swap

        amountOut = amountIn; // will be overwritten after `swap`
        // If the tokenIn is a tOFT, unwrap it. Handles ETH and ERC20.
        if (swapData.toftInfo.isTokenInToft) {
            (tokenIn, amountOut) = _handleToftUnwrap(tokenIn, amountIn);
        }
        if (swapData.toftInfo.isTokenOutToft) {
            tokenOut = ITOFT(tokenOut).erc20();
        }

        IZeroXSwapper.SZeroXSwapData memory swapperData =
            abi.decode(swapData.swapperData, (IZeroXSwapper.SZeroXSwapData));

        if (address(swapperData.sellToken) != tokenIn) revert TokenNotValid();
        if (address(swapperData.buyToken) != tokenOut) revert TokenNotValid();

        uint256 amountInBefore = IERC20(tokenIn).balanceOf(address(this));
        uint256 _amountInBeforeSwap = amountOut;

        // Approve the swapper to spend the tokenIn, and perform the swap.
        tokenIn.safeApprove(address(swapper), amountOut);
        amountOut = swapper.swap(swapperData, amountOut, swapData.minAmountOut);
        if (amountOut < swapData.minAmountOut) revert MinAmountNotValid(swapData.minAmountOut, amountOut);
        tokenIn.safeApprove(address(swapper), 0);

        uint256 amountInAfter = IERC20(tokenIn).balanceOf(address(this));

        // @dev should never be the case otherwise
        if (amountInBefore > amountInAfter) {
            uint256 transferred = amountInBefore - amountInAfter;
            if (transferred < _amountInBeforeSwap) {
                IERC20(tokenIn).safeTransfer(from, _amountInBeforeSwap - transferred);
            }
        }

        // If the tokenOut is a tOFT, wrap it. Handles ETH and ERC20.
        // If `sendBack` is true, wrap the `amountOut to` the sender. else, wrap it to this contract.
        if (swapData.toftInfo.isTokenOutToft) {
            amountOut = _handleToftWrapToSender(sendBack, toftTokenOut, amountOut);
        } else if (sendBack == true) {
            // If the token wasn't sent by the wrap OP, send it as a transfer.
            IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        }
    }

    /**
     * @notice Unwraps a tOFT token if it is the tokenIn. If the tOFT is an ERC20, it unwraps it and returns the ERC20 address.
     * if the tOFT is an ETH, it unwraps it and returns the WETH address.
     *
     * @param tokenIn tOFT token to unwrap.
     * @param amountIn amount to unwrap.
     * @return tokenToSwap address of the token to swap. Either WETH or the ERC20 address.
     */
    function _handleToftUnwrap(address tokenIn, uint256 amountIn)
        internal
        returns (address tokenToSwap, uint256 unwrapped)
    {
        unwrapped = ITOFT(tokenIn).unwrap(address(this), amountIn); // Sends ETH to `receive()` if not an ERC20.
        tokenIn = ITOFT(tokenIn).erc20();
        // If the tokenIn is ETH, wrap it to WETH.
        if (tokenIn == address(0)) {
            weth.deposit{value: unwrapped}();
            tokenToSwap = address(weth);
        } else {
            tokenToSwap = tokenIn;
        }
    }

    /**
     * @notice Wrap an ERC20 or ETH to a `tokenOut` tOFT token.
     * @dev Wraps the amountOut and sends it to the sender.
     *
     * @param sendBack if true, sends the `amountOut` to the sender. Else, sends it to this contract.
     * @param tokenOut tOFT token.
     * @param amountOut amount to wrap.
     */
    function _handleToftWrapToSender(bool sendBack, address tokenOut, uint256 amountOut)
        internal
        returns (uint256 _amountOut)
    {
        address toftErc20 = ITOFT(tokenOut).erc20();
        address wrapsTo = sendBack == true ? msg.sender : address(this);

        if (toftErc20 == address(0)) {
            // If the tOFT is for ETH, withdraw from WETH and wrap it.
            weth.withdraw(amountOut);
            _amountOut = ITOFT(tokenOut).wrap{value: amountOut}(address(this), wrapsTo, amountOut);
        } else {
            // If the tOFT is for an ERC20, wrap it.
            pearlmit.approve(20, toftErc20, 0, tokenOut, amountOut.toUint200(), block.timestamp.toUint48());
            toftErc20.safeApprove(address(pearlmit), amountOut);

            _amountOut = ITOFT(tokenOut).wrap(address(this), address(this), amountOut);
            IERC20(tokenOut).safeTransfer(wrapsTo, _amountOut);

            toftErc20.safeApprove(address(pearlmit), 0);
            pearlmit.clearAllowance(address(this), 20, toftErc20, 0);
        }
    }
}
