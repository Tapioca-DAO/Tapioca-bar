// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {UsdoInitStruct, MarketRemoveAssetMsg, MarketLendOrRepayMsg} from "tap-utils/interfaces/oft/IUsdo.sol";
import {IDepositData, ICommonExternalContracts} from "tap-utils/interfaces/common/ICommonData.sol";
import {
    IMagnetar,
    MagnetarCall,
    MagnetarAction,
    DepositRepayAndRemoveCollateralFromMarketData,
    MintFromBBAndLendOnSGLData,
    ExitPositionAndRemoveCollateralData
} from "tap-utils/interfaces/periph/IMagnetar.sol";
import {IMagnetarCollateralModule, IMagnetarOptionModule,IMagnetarMintModule} from "tap-utils/interfaces/periph/IMagnetar.sol";

import {IMagnetarHelper} from "tap-utils/interfaces/periph/IMagnetarHelper.sol";
import {IMintData} from "tap-utils/interfaces/oft/IUsdo.sol";
import {IMarket} from "tap-utils/interfaces/bar/IMarket.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";
import {UsdoMsgCodec} from "../libraries/UsdoMsgCodec.sol";
import {BaseUsdo} from "../BaseUsdo.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/**
 * @title UsdoMarketReceiverModule
 * @author TapiocaDAO
 * @notice Usdo Market module
 */
contract UsdoMarketReceiverModule is BaseUsdo {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;
    using SafeApprove for address;
    using SafeCast for uint256;

    error UsdoMarketReceiverModule_NotAuthorized(address invalidAddress, bytes reason);

    event LendOrRepayReceived(address indexed user, address indexed srcChainSender, bool repay, address indexed market);
    event RemoveAssetReceived(address indexed user, address indexed srcChainSender, address indexed magnetar);

    constructor(UsdoInitStruct memory _data) BaseUsdo(_data) {}

    /**
     * @notice Receiver for PT_YB_SEND_SGL_LEND_OR_REPAY
     * @param srcChainSender The address of the sender on the source chain.
     * @param _data The call data containing info about the operation.
     *      - user::address: Address to leverage for.
     *      - lendParams::struct: Struct containing data for the lend or the repay operations
     *      - withdrawParams::struct: Struct containing data for the asset withdrawal operation
     */
    function lendOrRepayReceiver(address srcChainSender, bytes memory _data) public payable {
        MarketLendOrRepayMsg memory msg_ = UsdoMsgCodec.decodeMarketLendOrRepayMsg(_data);

        /**
         * @dev validate data
         */
        msg_ = _validateLendOrRepayReceiver(msg_);

        /**
         * @dev Pearlmit approvals
         */
        // approve(address(msg_.lendParams.magnetar), msg_.lendParams.depositAmount);
        approve(address(pearlmit), msg_.lendParams.depositAmount);
        pearlmit.approve(
            20,
            address(this),
            0,
            msg_.lendParams.magnetar,
            uint200(msg_.lendParams.depositAmount),
            block.timestamp.toUint48()
        );

        /**
         * @dev Lend or Repay through `magnetar`
         */
        if (msg_.lendParams.repay) {
            _repay(msg_, srcChainSender);
        } else {
            _lend(msg_, srcChainSender);
        }

        /**
         * @dev Pearlmit revokes
         */
        approve(address(pearlmit), 0);

        emit LendOrRepayReceived(msg_.user, srcChainSender, msg_.lendParams.repay, msg_.lendParams.market);
    }

    /**
     * @notice Receiver for PT_MARKET_REMOVE_ASSET
     * @param srcChainSender The address of the sender on the source chain.
     * @param _data The call data containing info about the operation.
     *      - user::address: Address to leverage for.
     *      - externalData::struct: Struct containing addresses used by this operation.
     *      - removeAndRepayData::struct: Struct containing data for the asset removal operation
     */
    function removeAssetReceiver(address srcChainSender, bytes memory _data) public payable {
        MarketRemoveAssetMsg memory msg_ = UsdoMsgCodec.decodeMarketRemoveAssetMsg(_data);

        /**
         * @dev validate data
         */
        msg_ = _validateRemoveAsset(msg_, srcChainSender);

        /**
         * @dev Remove asset through `magnetar`
         */
        _removeAsset(msg_);

        emit RemoveAssetReceived(msg_.user, srcChainSender, msg_.externalData.magnetar);
    }

    function _validateLendOrRepayReceiver(MarketLendOrRepayMsg memory msg_)
        private
        view
        returns (MarketLendOrRepayMsg memory)
    {
        _checkWhitelistStatus(msg_.lendParams.magnetar, "USDO_MAGNETAR_CALLEE");
        _checkWhitelistStatus(msg_.lendParams.marketHelper, "USDO_HELPER_CALLEE");
        _checkWhitelistStatus(msg_.lendParams.market, "USDO_MARKET_CALLEE");
        _checkWhitelistStatus(msg_.lendParams.lockData.target, "USDO_TAP_CALLEE");
        _checkWhitelistStatus(msg_.lendParams.participateData.target, "USDO_TAP_CALLEE");

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
        return msg_;
    }

    function _repay(MarketLendOrRepayMsg memory msg_, address srcChainSender) private {
        if (msg_.lendParams.repayAmount == 0) {
            msg_.lendParams.repayAmount = msg_.lendParams.depositAmount;
        }

        _validateAndSpendAllowance(msg_.user, srcChainSender, msg_.lendParams.depositAmount);

        if (msg_.lendParams.removeCollateralAmount > 0) {
            IMarket(msg_.lendParams.market).updateExchangeRate();
            uint256 exchangeRatePrecision = IMarket(msg_.lendParams.market)._exchangeRatePrecision();
            uint256 exchangeRate = IMarket(msg_.lendParams.market)._exchangeRate();
            uint256 collateralPartInAsset = (msg_.lendParams.removeCollateralAmount * exchangeRatePrecision + exchangeRate - 1) / exchangeRate;
            _validateAndSpendAllowance(msg_.user, srcChainSender, collateralPartInAsset);
        }

        bytes memory call = abi.encodeWithSelector(
            IMagnetarCollateralModule.depositRepayAndRemoveCollateralFromMarket.selector,
            DepositRepayAndRemoveCollateralFromMarketData({
                market: msg_.lendParams.market,
                marketHelper: msg_.lendParams.marketHelper,
                user: msg_.user,
                depositAmount: msg_.lendParams.depositAmount,
                repayAmount: msg_.lendParams.repayAmount,
                collateralAmount: msg_.lendParams.removeCollateralAmount,
                withdrawCollateralParams: msg_.withdrawParams
            })
        );
        MagnetarCall[] memory magnetarCall = new MagnetarCall[](1);
        magnetarCall[0] = MagnetarCall({
            id: uint8(MagnetarAction.CollateralModule),
            target: msg_.lendParams.magnetar, //ignored in modules call
            value: msg.value,
            call: call
        });
        IMagnetar(payable(msg_.lendParams.magnetar)).burst{value: msg_.value}(magnetarCall);
    }

    function _lend(MarketLendOrRepayMsg memory msg_, address srcChainSender) private {
        if (msg_.user != srcChainSender) {
            uint256 allowanceAmont = msg_.lendParams.depositAmount + msg_.lendParams.lockData.amount;
            _spendAllowance(msg_.user, srcChainSender, allowanceAmont);
        }

        MintFromBBAndLendOnSGLData memory _lendData = MintFromBBAndLendOnSGLData({
            user: msg_.user,
            lendAmount: msg_.lendParams.depositAmount,
            mintData: IMintData({
                mint: false,
                mintAmount: 0,
                collateralDepositData: IDepositData({deposit: false, amount: 0})
            }),
            depositData: IDepositData({deposit: true, amount: msg_.lendParams.depositAmount}),
            lockData: msg_.lendParams.lockData,
            participateData: msg_.lendParams.participateData,
            externalContracts: ICommonExternalContracts({
                magnetar: msg_.lendParams.magnetar,
                singularity: msg_.lendParams.market,
                bigBang: address(0),
                marketHelper: msg_.lendParams.marketHelper
            })
        });
        bytes memory call = abi.encodeWithSelector(IMagnetarMintModule.mintBBLendSGLLockTOLP.selector, _lendData);
        MagnetarCall[] memory magnetarCall = new MagnetarCall[](1);
        magnetarCall[0] = MagnetarCall({
            id: uint8(MagnetarAction.MintModule),
            target: msg_.lendParams.magnetar, //ignored in modules call
            value: msg.value,
            call: call
        });

        IMagnetar(payable(msg_.lendParams.magnetar)).burst{value: msg_.value}(magnetarCall);
    }

    function _validateRemoveAsset(MarketRemoveAssetMsg memory msg_, address srcChainSender)
        private
        returns (MarketRemoveAssetMsg memory)
    {
        _checkWhitelistStatus(msg_.externalData.magnetar, "USDO_MAGNETAR_CALLEE");
        _checkWhitelistStatus(msg_.externalData.singularity, "USDO_MARKET_CALLEE");
        _checkWhitelistStatus(msg_.externalData.bigBang, "USDO_MARKET_CALLEE");
        _checkWhitelistStatus(msg_.externalData.marketHelper, "USDO_HELPER_CALLEE");

        msg_.removeAndRepayData.removeAmount = _toLD(msg_.removeAndRepayData.removeAmount.toUint64());
        msg_.removeAndRepayData.repayAmount = _toLD(msg_.removeAndRepayData.repayAmount.toUint64());
        msg_.removeAndRepayData.collateralAmount = _toLD(msg_.removeAndRepayData.collateralAmount.toUint64());

        _validateAndSpendAllowance(msg_.user, srcChainSender, msg_.removeAndRepayData.removeAmount);

        return msg_;
    }

    function _removeAsset(MarketRemoveAssetMsg memory msg_) private {
        bytes memory call = abi.encodeWithSelector(
            IMagnetarOptionModule.exitPositionAndRemoveCollateral.selector,
            ExitPositionAndRemoveCollateralData({
                user: msg_.user,
                externalData: msg_.externalData,
                removeAndRepayData: msg_.removeAndRepayData
            })
        );
        MagnetarCall[] memory magnetarCall = new MagnetarCall[](1);
        magnetarCall[0] = MagnetarCall({
            id: uint8(MagnetarAction.OptionModule),
            target: address(this), //ignored in module calls
            value: msg.value,
            call: call
        });
        IMagnetar(payable(msg_.externalData.magnetar)).burst{value: msg_.value}(magnetarCall);
    }

    function _checkWhitelistStatus(address _addr, bytes memory role) private view {
        if (_addr != address(0)) {
            // if (!getCluster().isWhitelisted(0, _addr)) {
            if (!getCluster().hasRole(_addr, keccak256(role))) {
                revert UsdoMarketReceiverModule_NotAuthorized(_addr, role);
            }
        }
    }
}
