// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// LZ
import {OFTMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTMsgCodec.sol";

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {
    UsdoInitStruct,
    MarketLeverageUpMsg,
    MarketRemoveAssetMsg,
    MarketLendOrRepayMsg
} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {
    ICommonData,
    IWithdrawParams,
    IDepositData,
    ICommonExternalContracts
} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {ITapiocaOFTBase, ITapiocaOFT, IBorrowParams} from "tapioca-periph/interfaces/tap-token/ITapiocaOFT.sol";
import {UsdoModuleReceiverHelper} from "contracts/usdo/modules/UsdoModuleReceiverHelper.sol";
import {IMagnetarHelper} from "tapioca-periph/interfaces/periph/IMagnetarHelper.sol";
import {IUSDOBase, IMintData} from "tapioca-periph/interfaces/bar/IUSDO.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IMagnetar} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {MarketBorrowMsg} from "tapioca-periph/interfaces/oft/ITOFT.sol";
import {IOftSender} from "tapioca-periph/interfaces/oft/IOftSender.sol";
import {UsdoMsgCodec} from "contracts/usdo/libraries/UsdoMsgCodec.sol";
import {ISwapper} from "tapioca-periph/interfaces/periph/ISwapper.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {BaseUsdo} from "contracts/usdo/BaseUsdo.sol";

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

/**
 * @title UsdoMarketReceiverModule
 * @author TapiocaDAO
 * @notice Usdo Market module
 */
contract UsdoMarketReceiverModule is BaseUsdo, UsdoModuleReceiverHelper {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;
    using SafeApprove for address;
    using SafeCast for uint256;

    error UsdoMarketReceiverModule_NotAuthorized(address invalidAddress);

    event LeverageUpReceived(address indexed user, address indexed market, uint256 indexed amount);

    constructor(UsdoInitStruct memory _data) BaseUsdo(_data) {}

    /**
     * @notice Receiver for PT_YB_SEND_SGL_LEND_OR_REPAY
     * @param _data The call data containing info about the operation.
     *      - user::address: Address to leverage for.
     *      - lendParams::struct: Struct containing data for the lend or the repay operations
     *      - withdrawParams::struct: Struct containing data for the asset withdrawal operation
     */
    function lendOrRepayReceiver(bytes memory _data) public payable {
        /// @dev decode received message
        MarketLendOrRepayMsg memory msg_ = UsdoMsgCodec.decodeMarketLendOrRepayMsg(_data);

        _checkWhitelistStatus(msg_.lendParams.marketHelper);
        _checkWhitelistStatus(msg_.lendParams.market);
        if (msg_.lendParams.lockData.lock) {
            _checkWhitelistStatus(msg_.lendParams.lockData.target);
        }
        if (msg_.lendParams.participateData.participate) {
            _checkWhitelistStatus(msg_.lendParams.participateData.target);
        }

        {
            if (msg_.lendParams.depositAmount > 0) {
                msg_.lendParams.depositAmount = _toLD(msg_.lendParams.depositAmount.toUint64());
            }
            if (msg_.lendParams.repayAmount > 0) {
                msg_.lendParams.repayAmount = _toLD(msg_.lendParams.repayAmount.toUint64());
            }
            if (msg_.lendParams.removeCollateralAmount > 0) {
                msg_.lendParams.removeCollateralAmount = _toLD(msg_.lendParams.removeCollateralAmount.toUint64());
            }
            if (msg_.lendParams.lockData.amount > 0) {
                msg_.lendParams.lockData.amount = _toLD(uint256(msg_.lendParams.lockData.amount).toUint64()).toUint128();
            }
            if (msg_.lendParams.lockData.fraction > 0) {
                msg_.lendParams.lockData.fraction = _toLD(msg_.lendParams.lockData.fraction.toUint64());
            }
        }

        approve(address(msg_.lendParams.marketHelper), msg_.lendParams.depositAmount);
        if (msg_.lendParams.repay) {
            if (msg_.lendParams.repayAmount == 0) {
                msg_.lendParams.repayAmount = IMagnetarHelper(IMagnetar(payable(msg_.lendParams.marketHelper)).helper())
                    .getBorrowPartForAmount(msg_.lendParams.market, msg_.lendParams.depositAmount);
            }
            IMagnetar.DepositRepayAndRemoveCollateralFromMarketData memory _repayData = IMagnetar
                .DepositRepayAndRemoveCollateralFromMarketData({
                market: msg_.lendParams.market,
                user: msg_.user,
                depositAmount: msg_.lendParams.depositAmount,
                repayAmount: msg_.lendParams.repayAmount,
                collateralAmount: msg_.lendParams.removeCollateralAmount,
                extractFromSender: true,
                withdrawCollateralParams: msg_.withdrawParams,
                valueAmount: msg.value
            });
            IMagnetar(payable(msg_.lendParams.marketHelper)).depositRepayAndRemoveCollateralFromMarket{value: msg.value}(
                _repayData
            );
        } else {
            IMagnetar.MintFromBBAndLendOnSGLData memory _lendData = IMagnetar.MintFromBBAndLendOnSGLData({
                user: msg_.user,
                lendAmount: msg_.lendParams.depositAmount,
                mintData: IMintData({
                    mint: false,
                    mintAmount: 0,
                    collateralDepositData: IDepositData({deposit: false, amount: 0, extractFromSender: false})
                }),
                depositData: IDepositData({deposit: true, amount: msg_.lendParams.depositAmount, extractFromSender: false}),
                lockData: msg_.lendParams.lockData,
                participateData: msg_.lendParams.participateData,
                externalContracts: ICommonExternalContracts({
                    magnetar: address(0),
                    singularity: msg_.lendParams.market,
                    bigBang: address(0)
                })
            });
            IMagnetar(payable(msg_.lendParams.marketHelper)).mintFromBBAndLendOnSGL{value: msg.value}(_lendData);
        }
    }

    /**
     * @notice Receiver for PT_MARKET_REMOVE_ASSET
     * @param _data The call data containing info about the operation.
     *      - user::address: Address to leverage for.
     *      - externalData::struct: Struct containing addresses used by this operation.
     *      - removeAndRepayData::struct: Struct containing data for the asset removal operation
     */
    function removeAssetReceiver(bytes memory _data) public payable {
        /// @dev decode received message
        MarketRemoveAssetMsg memory msg_ = UsdoMsgCodec.decodeMarketRemoveAssetMsg(_data);

        _checkWhitelistStatus(msg_.externalData.magnetar);
        _checkWhitelistStatus(msg_.externalData.singularity);
        _checkWhitelistStatus(msg_.externalData.bigBang);

        msg_.removeAndRepayData.removeAmount = _toLD(msg_.removeAndRepayData.removeAmount.toUint64());
        msg_.removeAndRepayData.repayAmount = _toLD(msg_.removeAndRepayData.repayAmount.toUint64());
        msg_.removeAndRepayData.collateralAmount = _toLD(msg_.removeAndRepayData.collateralAmount.toUint64());
        if (msg_.removeAndRepayData.assetWithdrawData.withdrawLzFeeAmount > 0) {
            msg_.removeAndRepayData.assetWithdrawData.withdrawLzFeeAmount =
                _toLD(msg_.removeAndRepayData.assetWithdrawData.withdrawLzFeeAmount.toUint64());
        }
        if (msg_.removeAndRepayData.collateralWithdrawData.withdrawLzFeeAmount > 0) {
            msg_.removeAndRepayData.collateralWithdrawData.withdrawLzFeeAmount =
                _toLD(msg_.removeAndRepayData.collateralWithdrawData.withdrawLzFeeAmount.toUint64());
        }

        {
            IMagnetar.ExitPositionAndRemoveCollateralData memory _exitData = IMagnetar
                .ExitPositionAndRemoveCollateralData({
                user: msg_.user,
                externalData: msg_.externalData,
                removeAndRepayData: msg_.removeAndRepayData,
                valueAmount: msg.value
            });
            IMagnetar(payable(msg_.externalData.magnetar)).exitPositionAndRemoveCollateral{value: msg.value}(_exitData);
        }
    }

    /**
     * @notice Performs market.leverageUp()
     * @param _data The call data containing info about the operation.
     *      - user::address: Address to leverage for.
     *      - amount::uint256: Address to debit tokens from.
     *      - swapData::struct: Swap operation related params
     *      - externalData::struct: Struct containing addresses used by this operation.
     *      - lzSendParam::struct: LZ v2 send back to source params
     *      - composeMsg::bytes: lzCompose message to be executed back on source
     */
    function marketLeverageUpReceiver(bytes memory _data) public payable {
        /// @dev decode received message
        MarketLeverageUpMsg memory msg_ = UsdoMsgCodec.decodeMarketLeverageUpMsg(_data);

        _checkWhitelistStatus(msg_.externalData.srcMarket);
        _checkWhitelistStatus(msg_.externalData.magnetar);
        _checkWhitelistStatus(msg_.externalData.swapper);
        _checkWhitelistStatus(msg_.externalData.tOft);
        _checkWhitelistStatus(OFTMsgCodec.bytes32ToAddress(msg_.lzSendParams.sendParam.to));
        if (msg_.swapData.tokenOut != address(0)) {
            _checkWhitelistStatus(msg_.swapData.tokenOut);
        }

        msg_.amount = _toLD(msg_.amount.toUint64());
        msg_.swapData.amountOutMin = _toLD(msg_.swapData.amountOutMin.toUint64());

        uint256 amountOut;

        // @dev swap Usdo with `tokenOut`
        {
            _approve(address(this), msg_.externalData.swapper, msg_.amount);
            ISwapper.SwapData memory _swapperData =
                ISwapper(msg_.externalData.swapper).buildSwapData(address(this), msg_.swapData.tokenOut, msg_.amount, 0);
            (amountOut,) = ISwapper(msg_.externalData.swapper).swap(
                _swapperData, msg_.swapData.amountOutMin, address(this), msg_.swapData.data
            );
        }

        // @dev wrap into TOFT
        {
            if (msg_.swapData.tokenOut != address(0)) {
                msg_.swapData.tokenOut.safeApprove(msg_.externalData.tOft, amountOut);
            }
            ITapiocaOFTBase(msg_.externalData.tOft).wrap{value: msg_.swapData.tokenOut == address(0) ? amountOut : 0}(
                address(this), address(this), amountOut
            );
        }

        // @dev prepare LZ call for TOFT
        _toftSendAndBorrow(msg_, amountOut, msg_.composeGas);

        emit LeverageUpReceived(msg_.user, msg_.externalData.srcMarket, msg_.amount);
    }

    function _checkWhitelistStatus(address _addr) private view {
        if (_addr != address(0)) {
            if (!cluster.isWhitelisted(0, _addr)) {
                revert UsdoMarketReceiverModule_NotAuthorized(_addr);
            }
        }
    }

    function _toftSendAndBorrow(MarketLeverageUpMsg memory msg_, uint256 amountOut, uint128 composeGas) private {
        MarketBorrowMsg memory _marketBorrowMsg = MarketBorrowMsg({
            user: msg_.user,
            borrowParams: IBorrowParams({
                amount: amountOut,
                borrowAmount: 0,
                marketHelper: msg_.externalData.magnetar,
                market: msg_.externalData.srcMarket,
                deposit: true
            }),
            withdrawParams: IWithdrawParams({
                withdraw: false,
                withdrawLzFeeAmount: 0,
                withdrawOnOtherChain: false,
                withdrawLzChainId: 0,
                withdrawAdapterParams: "0x",
                unwrap: false,
                refundAddress: payable(0),
                zroPaymentAddress: address(0)
            })
        });
        bytes memory marketBorrowMsg_ = abi.encode(_marketBorrowMsg);

        uint16 _tOFTComposeMsgId= 801;

        _sendComposed(
            msg_.lzSendParams.sendParam.dstEid,
            msg_.externalData.tOft,
            address(usdoHelper),
            amountOut,
            _tOFTComposeMsgId,
            marketBorrowMsg_,
            composeGas
        );
    }
}
