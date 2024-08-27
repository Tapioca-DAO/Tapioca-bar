// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// LZ
import {
    SendParam,
    MessagingFee,
    MessagingReceipt,
    OFTReceipt
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {OptionsBuilder} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import {OFTMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTMsgCodec.sol";


// Tapioca
import {UsdoInitStruct, UsdoModulesInitStruct, MarketLendOrRepayMsg, MarketRemoveAssetMsg, IRemoveAndRepay,
    ILendOrRepayParams} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {TapiocaOmnichainExtExec} from "tapioca-periph/tapiocaOmnichainEngine/extension/TapiocaOmnichainExtExec.sol";
import {UsdoHelper} from "contracts/usdo/extensions/UsdoHelper.sol";
import {Usdo} from "contracts/usdo/Usdo.sol";

import {IOptionsExitData} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {ICommonExternalContracts} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {
    ITapiocaOptionLiquidityProvision,
    IOptionsLockData,
    IOptionsUnlockData
} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionLiquidityProvision.sol";
import {
    ITapiocaOptionBroker,
    IExerciseOptionsData,
    IOptionsParticipateData
} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {MagnetarWithdrawData} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";

// tests
import {Base_Test} from "../../Base_Test.t.sol";

abstract contract Usdo_Unit_Shared is Base_Test {
    // ************ //
    // *** VARS *** //
    // ************ //
    UsdoHelper usdoHelper;

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public virtual override {
        super.setUp();

        usdoHelper = new UsdoHelper();
        vm.label(address(usdoHelper), "usdoHelper");
    }

    // **************** //
    // *** INTERNAL *** //
    // **************** //
    function _tryCreateUsdo(bool shouldRevert, address _sender, address _receiver, address _marketReceiver, address _optionReceiver) internal {
        TapiocaOmnichainExtExec extExec = new TapiocaOmnichainExtExec();
        UsdoInitStruct memory usdoInitStruct = UsdoInitStruct({
            endpoint: address(endpoints[aEid]),
            delegate: address(this),
            yieldBox: address(yieldBox),
            cluster: address(cluster),
            extExec: address(extExec),
            pearlmit: IPearlmit(address(pearlmit))
        });

        UsdoModulesInitStruct memory usdoModulesInitStruct = UsdoModulesInitStruct({
            usdoSenderModule: address(_sender),
            usdoReceiverModule: address(_receiver),
            marketReceiverModule: address(_marketReceiver),
            optionReceiverModule: address(_optionReceiver)
        });
        if (shouldRevert) {
            vm.expectRevert(Usdo.Usdo_NotValid.selector);
        }
        usdo = new Usdo(usdoInitStruct, usdoModulesInitStruct);
    }

    struct _LendOrRepayInternal {
        bool repay; 
        bool lock;
        bool participate;
        bool removeCollateral;
        uint256 repayAmount;
        uint256 depositAmount;
        address magnetar;
        address marketHelper;
        address market;
        uint256 removeCollateralAmount;
        address lockDataTarget;
        address participateDataTarget;
    }
    function _createMinimalLendOrRepayMsg(
        _LendOrRepayInternal memory data
    ) internal view returns (MarketLendOrRepayMsg memory marketMsg) {
        uint256 _depositAmountSD = usdoHelper.toSD(data.depositAmount, usdo.decimalConversionRate());
        uint256 _repayAmountSD = usdoHelper.toSD(data.repayAmount, usdo.decimalConversionRate());
        uint256 _removeCollateralAmountSD = usdoHelper.toSD(data.removeCollateralAmount, usdo.decimalConversionRate());

        marketMsg = MarketLendOrRepayMsg({
            user: address(this),
            lendParams: ILendOrRepayParams({
                repay: data.repay,
                depositAmount: _depositAmountSD,
                repayAmount: _repayAmountSD,
                magnetar: data.magnetar,
                marketHelper: data.marketHelper,
                market: data.market,
                removeCollateral: data.removeCollateral,
                removeCollateralAmount: _removeCollateralAmountSD,
                lockData: IOptionsLockData({lock: data.lock, target: data.lockDataTarget, tAsset:address(0), lockDuration: 0, amount: 0, fraction: 0, minDiscountOut: 0}),
                participateData: IOptionsParticipateData({participate: data.participate, target: data.participateDataTarget, tOLPTokenId: 0})
            }),
            withdrawParams: MagnetarWithdrawData({
                yieldBox: address(0),
                assetId: 0,
                unwrap: false,
                amount: 0,
                withdraw: false,
                receiver: address(this),
                extractFromSender: false
            }),
            value: 0
        });
    }

    struct _RemoveAssetInternal {
        address magnetar;
        address marketHelper;
        address market;
        uint256 removeAmount;
    }
    function _createMinimalRemoveAssetMsg(_RemoveAssetInternal memory data) internal view returns (MarketRemoveAssetMsg memory marketMsg) {
        uint256 _removeAmountSD = usdoHelper.toSD(data.removeAmount, usdo.decimalConversionRate());

        marketMsg = MarketRemoveAssetMsg({
            user: address(this),
            externalData: ICommonExternalContracts({
                magnetar: data.magnetar,
                singularity: data.market,
                bigBang: address(0),
                marketHelper: data.marketHelper
            }),
            removeAndRepayData: IRemoveAndRepay({
                removeAssetFromSGL: true,
                removeAmount: _removeAmountSD,
                repayAssetOnBB: false,
                repayAmount: 0,
                removeCollateralFromBB: false,
                collateralAmount: 0,
                exitData: IOptionsExitData({exit: false, target: address(0), oTAPTokenID: 0}),
                unlockData: IOptionsUnlockData({unlock: false, target: address(0), tokenId: 0}),
                assetWithdrawData: MagnetarWithdrawData({
                    yieldBox: address(0),
                    assetId: 0,
                    unwrap: false,
                    amount: 0,
                    withdraw: false,
                    receiver: address(this),
                    extractFromSender: false
                }),
                collateralWithdrawData: MagnetarWithdrawData({
                    yieldBox: address(0),
                    assetId: 0,
                    unwrap: false,
                    amount: 0,
                    withdraw: false,
                    receiver: address(this),
                    extractFromSender: false
                })
            }),
            value: 0
        });
    }
    // function _prepareLendOrRepayMsg() internal {
    //     // pearlmit.approve(20, address(bUsdo), 0, address(magnetar), uint200(tokenAmount_), uint48(block.timestamp)); // Atomic approval
    //     // bUsdo.approve(address(pearlmit), tokenAmount_);

    //     uint256 erc20Amount_ = 1 ether;
    //     uint256 tokenAmount_ = 0.5 ether;

    //     LZSendParam memory withdrawLzSendParam_;
    //     MessagingFee memory withdrawMsgFee_; // Will be used as value for the composed msg

    //     {
    //         // @dev `withdrawMsgFee_` is to be airdropped on dst to pay for the send to source operation (B->A).
    //         PrepareLzCallReturn memory prepareLzCallReturn1_ = usdoHelper.prepareLzCall( // B->A data
    //             IUsdo(address(bUsdo)),
    //             PrepareLzCallData({
    //                 dstEid: aEid,
    //                 recipient: OFTMsgCodec.addressToBytes32(address(this)),
    //                 amountToSendLD: 0,
    //                 minAmountToCreditLD: 0,
    //                 msgType: SEND,
    //                 composeMsgData: ComposeMsgData({
    //                     index: 0,
    //                     gas: 0,
    //                     value: 0,
    //                     data: bytes(""),
    //                     prevData: bytes(""),
    //                     prevOptionsData: bytes("")
    //                 }),
    //                 lzReceiveGas: 5_000_000,
    //                 lzReceiveValue: 0,
    //                 refundAddress: address(this)
    //             })
    //         );
    //         withdrawLzSendParam_ = prepareLzCallReturn1_.lzSendParam;
    //         withdrawMsgFee_ = prepareLzCallReturn1_.msgFee;
    //     }

    //     /**
    //      * Actions
    //      */
    //     singularity.approve(address(magnetar), type(uint256).max);

    //     uint256 sh = yieldBox.toShare(bUsdoYieldBoxId, tokenAmount_, false);
    //     pearlmit.approve(
    //         1155, address(yieldBox), bUsdoYieldBoxId, address(singularity), uint200(sh), uint48(block.timestamp)
    //     ); // Atomic approval
    //     yieldBox.setApprovalForAll(address(pearlmit), true);

    //     uint256 tokenAmountSD = usdoHelper.toSD(tokenAmount_, aUsdo.decimalConversionRate());
    //     MarketLendOrRepayMsg memory marketMsg = MarketLendOrRepayMsg({
    //         user: address(this),
    //         lendParams: ILendOrRepayParams({
    //             repay: false,
    //             depositAmount: tokenAmountSD,
    //             repayAmount: 0,
    //             magnetar: address(magnetar),
    //             marketHelper: address(marketHelper),
    //             market: address(singularity),
    //             removeCollateral: false,
    //             removeCollateralAmount: 0,
    //             lockData: IOptionsLockData({lock: false, target: address(0), tAsset:address(0), lockDuration: 0, amount: 0, fraction: 0, minDiscountOut: 0}),
    //             participateData: IOptionsParticipateData({participate: false, target: address(0), tOLPTokenId: 0})
    //         }),
    //         withdrawParams: MagnetarWithdrawData({
    //             yieldBox: address(0),
    //             assetId: 0,
    //             unwrap: false,
    //             amount: 0,
    //             withdraw: false,
    //             receiver: address(this),
    //             extractFromSender: false
    //         }),
    //         value: 0
    //     });

    //     bytes memory marketMsg_ = usdoHelper.buildMarketLendOrRepayMsg(marketMsg);

    //     PrepareLzCallReturn memory prepareLzCallReturn2_ = usdoHelper.prepareLzCall(
    //         IUsdo(address(aUsdo)),
    //         PrepareLzCallData({
    //             dstEid: bEid,
    //             recipient: OFTMsgCodec.addressToBytes32(address(this)),
    //             amountToSendLD: 0,
    //             minAmountToCreditLD: 0,
    //             msgType: PT_YB_SEND_SGL_LEND_OR_REPAY,
    //             composeMsgData: ComposeMsgData({
    //                 index: 0,
    //                 gas: 5_000_000,
    //                 value: uint128(withdrawMsgFee_.nativeFee),
    //                 data: marketMsg_,
    //                 prevData: bytes(""),
    //                 prevOptionsData: bytes("")
    //             }),
    //             lzReceiveGas: 5_000_000,
    //             lzReceiveValue: 0,
    //             refundAddress: address(this)
    //         })
    //     );
    //     bytes memory oftMsgOptions_ = prepareLzCallReturn2_.oftMsgOptions;
    //     MessagingReceipt memory msgReceipt_;
    //     bytes memory sentMsg;

    //     {
    //         bytes memory composeMsg_ = prepareLzCallReturn2_.composeMsg;
    //         MessagingFee memory msgFee_ = prepareLzCallReturn2_.msgFee;
    //         LZSendParam memory lzSendParam_ = prepareLzCallReturn2_.lzSendParam;
    //         (msgReceipt_,, sentMsg,) = aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);
    //     }

    //     {
    //         verifyPackets(uint32(bEid), address(bUsdo));

    //         __callLzCompose(
    //             LzOFTComposedData(
    //                 PT_YB_SEND_SGL_LEND_OR_REPAY,
    //                 msgReceipt_.guid,
    //                 sentMsg,
    //                 bEid,
    //                 address(bUsdo), // Compose creator (at lzReceive)
    //                 address(bUsdo), // Compose receiver (at lzCompose)
    //                 address(this),
    //                 oftMsgOptions_
    //             )
    //         );
    //     }

    //     // Check execution
    //     {
    //         assertLt(bUsdo.balanceOf(address(this)), erc20Amount_);
    //     }
    // }
}