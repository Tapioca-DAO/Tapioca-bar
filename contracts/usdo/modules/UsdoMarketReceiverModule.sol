// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {UsdoInitStruct, MarketRemoveAssetMsg, MarketLendOrRepayMsg} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {IDepositData, ICommonExternalContracts} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {
    IMagnetar,
    MagnetarCall,
    MagnetarAction,
    DepositRepayAndRemoveCollateralFromMarketData,
    MintFromBBAndLendOnSGLData,
    ExitPositionAndRemoveCollateralData,
    DepositAndSendForLockingData
} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {MagnetarOptionModule} from "tapioca-periph/Magnetar/modules/MagnetarOptionModule.sol";
import {MagnetarAssetXChainModule} from "tapioca-periph/Magnetar/modules/MagnetarAssetXChainModule.sol";
import {MagnetarAssetModule} from "tapioca-periph/Magnetar/modules/MagnetarAssetModule.sol";
import {MagnetarMintModule} from "tapioca-periph/Magnetar/modules/MagnetarMintModule.sol";
import {IMagnetarHelper} from "tapioca-periph/interfaces/periph/IMagnetarHelper.sol";
import {IMintData} from "tapioca-periph/interfaces/oft/IUsdo.sol";
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

    error UsdoMarketReceiverModule_NotAuthorized(address invalidAddress);

    event LeverageUpReceived(address indexed user, address indexed market, uint256 indexed amount);

    constructor(UsdoInitStruct memory _data) BaseUsdo(_data) {}

    /**
     * @notice Execute `magnetar.depositLendAndSendForLocking`
     * @dev Lend on SGL and send receipt token on another layer
     * @param _data.user the user to perform the operation for
     * @param _data.singularity the SGL address
     * @param _data.lendAmount the amount to lend on SGL
     * @param _data.depositData the data needed to deposit on YieldBox
     * @param _data.lockAndParticipateSendParams LZ send params for the lock or/and the participate operations
     */
    function depositLendAndSendForLockingReceiver(bytes memory _data) public payable {
        // Decode received message.
        DepositAndSendForLockingData memory msg_ = UsdoMsgCodec.decodeDepositLendAndSendForLockingMsg(_data);

        _checkWhitelistStatus(msg_.singularity);
        _checkWhitelistStatus(msg_.magnetar);

        if (msg_.lendAmount > 0) {
            msg_.lendAmount = _toLD(msg_.lendAmount.toUint64());
        }
        if (msg_.depositData.amount > 0) {
            msg_.depositData.amount = _toLD(msg_.depositData.amount.toUint64());
        }

        bytes memory call =
            abi.encodeWithSelector(MagnetarAssetXChainModule.depositYBLendSGLLockXchainTOLP.selector, msg_);
        MagnetarCall[] memory magnetarCall = new MagnetarCall[](1);
        magnetarCall[0] = MagnetarCall({
            id: MagnetarAction.AssetModule,
            target: msg_.magnetar,
            value: msg.value,
            allowFailure: false,
            call: call
        });
        IMagnetar(payable(msg_.magnetar)).burst{value: msg.value}(magnetarCall);
    }

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

        _checkWhitelistStatus(msg_.lendParams.magnetar);
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

        // approve(address(msg_.lendParams.magnetar), msg_.lendParams.depositAmount);
        approve(address(pearlmit), msg_.lendParams.depositAmount);
        pearlmit.approve(
            address(this),
            0,
            msg_.lendParams.magnetar,
            uint200(msg_.lendParams.depositAmount),
            uint48(block.timestamp + 1)
        ); // Atomic approval
        if (msg_.lendParams.repay) {
            if (msg_.lendParams.repayAmount == 0) {
                msg_.lendParams.repayAmount = IMagnetarHelper(IMagnetar(payable(msg_.lendParams.magnetar)).helper())
                    .getBorrowPartForAmount(msg_.lendParams.market, msg_.lendParams.depositAmount);
            }
            bytes memory call = abi.encodeWithSelector(
                MagnetarAssetModule.depositRepayAndRemoveCollateralFromMarket.selector,
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
                id: MagnetarAction.AssetModule,
                target: msg_.lendParams.magnetar, //ignored in modules call
                value: msg.value,
                allowFailure: false,
                call: call
            });
            IMagnetar(payable(msg_.lendParams.magnetar)).burst{value: msg.value}(magnetarCall);
        } else {
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
            bytes memory call = abi.encodeWithSelector(MagnetarMintModule.mintBBLendSGLLockTOLP.selector, _lendData);
            MagnetarCall[] memory magnetarCall = new MagnetarCall[](1);
            magnetarCall[0] = MagnetarCall({
                id: MagnetarAction.MintModule,
                target: msg_.lendParams.magnetar, //ignored in modules call
                value: msg.value,
                allowFailure: false,
                call: call
            });

            IMagnetar(payable(msg_.lendParams.magnetar)).burst{value: msg.value}(magnetarCall);
        }
        approve(address(pearlmit), 0);
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

        {
            bytes memory call = abi.encodeWithSelector(
                MagnetarOptionModule.exitPositionAndRemoveCollateral.selector,
                ExitPositionAndRemoveCollateralData({
                    user: msg_.user,
                    externalData: msg_.externalData,
                    removeAndRepayData: msg_.removeAndRepayData
                })
            );
            MagnetarCall[] memory magnetarCall = new MagnetarCall[](1);
            magnetarCall[0] = MagnetarCall({
                id: MagnetarAction.OptionModule,
                target: address(this), //ignored in module calls
                value: msg.value,
                allowFailure: false,
                call: call
            });
            IMagnetar(payable(msg_.externalData.magnetar)).burst{value: msg.value}(magnetarCall);
        }
    }

    function _checkWhitelistStatus(address _addr) private view {
        if (_addr != address(0)) {
            if (!cluster.isWhitelisted(0, _addr)) {
                revert UsdoMarketReceiverModule_NotAuthorized(_addr);
            }
        }
    }
}
