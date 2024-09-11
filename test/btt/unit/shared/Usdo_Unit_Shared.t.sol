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
import {UsdoInitStruct, UsdoModulesInitStruct, MarketLendOrRepayMsg, MarketRemoveAssetMsg, IRemoveAndRepay, ILendOrRepayParams, YieldBoxApproveAllMsg, YieldBoxApproveAssetMsg, MarketPermitActionMsg, IUsdo} from "tap-utils/interfaces/oft/IUsdo.sol";
import {TapiocaOmnichainExtExec} from "tap-utils/tapiocaOmnichainEngine/extension/TapiocaOmnichainExtExec.sol";
import {UsdoHelper} from "contracts/usdo/extensions/UsdoHelper.sol";
import {Usdo} from "contracts/usdo/Usdo.sol";

import {IOptionsExitData} from "tap-utils/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {ICommonExternalContracts} from "tap-utils/interfaces/common/ICommonData.sol";
import {
    ITapiocaOptionLiquidityProvision,
    IOptionsLockData,
    IOptionsUnlockData
} from "tap-utils/interfaces/tap-token/ITapiocaOptionLiquidityProvision.sol";
import {
    ITapiocaOptionBroker,
    IExerciseOptionsData,
    IOptionsParticipateData
} from "tap-utils/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {MagnetarWithdrawData} from "tap-utils/interfaces/periph/IMagnetar.sol";
import {IPearlmit} from "tap-utils/pearlmit/Pearlmit.sol";

import {
    TapiocaOmnichainEngineHelper,
    PrepareLzCallData,
    PrepareLzCallReturn,
    ComposeMsgData,
    LZSendParam,
    RemoteTransferMsg
} from "tap-utils/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {ERC20PermitStruct, ERC20PermitApprovalMsg} from "tap-utils/interfaces/periph/ITapiocaOmnichainEngine.sol";

// tests
import {Base_Test} from "../../Base_Test.t.sol";

import "forge-std/console.sol";

abstract contract Usdo_Unit_Shared is Base_Test {
    // ************ //
    // *** VARS *** //
    // ************ //
    UsdoHelper usdoHelper;

    struct LzOFTComposedData {
        uint16 msgType;
        bytes32 guid;
        bytes composeMsg;
        uint32 dstEid;
        address from;
        address to;
        address srcMsgSender;
        bytes extraOptions;
    }

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
        address bb;
        uint256 removeAmount;
        uint256 repayAmount;
        uint256 removeCollateralAmount;
    }
    function _createMinimalRemoveAssetMsg(_RemoveAssetInternal memory data) internal view returns (MarketRemoveAssetMsg memory marketMsg) {
        uint256 _removeAmountSD = usdoHelper.toSD(data.removeAmount, usdo.decimalConversionRate());
        uint256 _repayAmountSD = usdoHelper.toSD(data.repayAmount, usdo.decimalConversionRate());
        uint256 _removeCollateralAmountSD = usdoHelper.toSD(data.removeCollateralAmount, usdo.decimalConversionRate());

        console.log("-------- _removeAmountSD            %s", _removeAmountSD);
        console.log("-------- _repayAmountSD             %s", _repayAmountSD);
        console.log("-------- _removeCollateralAmountSD  %s", _removeCollateralAmountSD);
        marketMsg = MarketRemoveAssetMsg({
            user: address(this),
            externalData: ICommonExternalContracts({
                magnetar: data.magnetar,
                singularity: data.market,
                bigBang: data.bb,
                marketHelper: data.marketHelper
            }),
            removeAndRepayData: IRemoveAndRepay({
                removeAssetFromSGL: true,
                removeAmount: _removeAmountSD,
                repayAssetOnBB: data.repayAmount > 0,
                repayAmount: _repayAmountSD,
                removeCollateralFromBB: data.removeCollateralAmount > 0,
                collateralAmount: _removeCollateralAmountSD,
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

    function _getYieldBoxPermitAssetTypedDataHash(ERC20PermitStruct memory _permitData, bool permit)
        internal
        view
        returns (bytes32)
    {
        bytes32 permitTypeHash_ = permit
            ? keccak256("Permit(address owner,address spender,uint256 assetId,uint256 nonce,uint256 deadline)")
            : keccak256("Revoke(address owner,address spender,uint256 assetId,uint256 nonce,uint256 deadline)");

        bytes32 structHash_ = keccak256(
            abi.encode(
                permitTypeHash_,
                _permitData.owner,
                _permitData.spender,
                _permitData.value, // @dev this is the assetId
                _permitData.nonce,
                _permitData.deadline
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", _getYieldBoxDomainSeparator(), structHash_));
    }

    function _getYieldBoxPermitAllTypedDataHash(ERC20PermitStruct memory _permitData, bool permit)
        internal
        view
        returns (bytes32)
    {
        bytes32 permitTypeHash_ = permit
            ? keccak256("PermitAll(address owner,address spender,uint256 nonce,uint256 deadline)")
            : keccak256("RevokeAll(address owner,address spender,uint256 nonce,uint256 deadline)");

        bytes32 structHash_ = keccak256(
            abi.encode(permitTypeHash_, _permitData.owner, _permitData.spender, _permitData.nonce, _permitData.deadline)
        );

        return keccak256(abi.encodePacked("\x19\x01", _getYieldBoxDomainSeparator(), structHash_));
    }
    function __getYieldBoxPermitAssetData(
        ERC20PermitStruct memory _permit,
        address _target,
        bool _isPermit,
        bytes32 _digest,
        uint256 _pkSigner
    ) internal pure returns (YieldBoxApproveAssetMsg memory permitApproval_) {
        (uint8 v_, bytes32 r_, bytes32 s_) = vm.sign(_pkSigner, _digest);

        permitApproval_ = YieldBoxApproveAssetMsg({
            target: _target,
            owner: _permit.owner,
            spender: _permit.spender,
            assetId: _permit.value,
            deadline: _permit.deadline,
            v: v_,
            r: r_,
            s: s_,
            permit: _isPermit
        });
    }
    function __getYieldBoxPermitAllData(
        ERC20PermitStruct memory _permit,
        address _target,
        bool _isPermit,
        bytes32 _digest,
        uint256 _pkSigner
    ) internal pure returns (YieldBoxApproveAllMsg memory permitApproval_) {
        (uint8 v_, bytes32 r_, bytes32 s_) = vm.sign(_pkSigner, _digest);

        permitApproval_ = YieldBoxApproveAllMsg({
            target: _target,
            owner: _permit.owner,
            spender: _permit.spender,
            deadline: _permit.deadline,
            v: v_,
            r: r_,
            s: s_,
            permit: _isPermit
        });
    }

    function _getMarketPermitTypedDataHash(
        bool permitAsset,
        address owner_,
        address spender_,
        uint256 value_,
        uint256 deadline_,
        uint256 nonce_,
        bytes32 domainSeparator_
    ) internal pure returns (bytes32) {
        bytes32 permitTypeHash_ = permitAsset
            ? bytes32(0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9)
            : bytes32(0xe9685ff6d48c617fe4f692c50e602cce27cbad0290beb93cfa77eac43968d58c);

        bytes32 structHash_ = keccak256(abi.encode(permitTypeHash_, owner_, spender_, value_, nonce_++, deadline_));

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator_, structHash_));
    }
    function __getMarketPermitData(MarketPermitActionMsg memory _permit, bytes32 _digest, uint256 _pkSigner)
        internal
        pure
        returns (MarketPermitActionMsg memory permitApproval_)
    {
        (uint8 v_, bytes32 r_, bytes32 s_) = vm.sign(_pkSigner, _digest);

        permitApproval_ = MarketPermitActionMsg({
            target: _permit.target,
            owner: _permit.owner,
            spender: _permit.spender,
            value: _permit.value,
            deadline: _permit.deadline,
            v: v_,
            r: r_,
            s: s_,
            permitAsset: _permit.permitAsset
        });
    }

    // *** Crosschain helpers *** //
    function __callLzCompose(LzOFTComposedData memory _lzOFTComposedData) internal {
        vm.expectEmit(true, true, true, false);
        emit ComposeReceived(_lzOFTComposedData.msgType, _lzOFTComposedData.guid, _lzOFTComposedData.composeMsg);

        this.lzCompose(
            _lzOFTComposedData.dstEid,
            _lzOFTComposedData.from,
            _lzOFTComposedData.extraOptions,
            _lzOFTComposedData.guid,
            _lzOFTComposedData.to,
            _lzOFTComposedData.composeMsg
        );
    }

    function _prepareLzCall(address _token, uint32 _dstEid, address _recipient, uint256 _amount, uint16 _msgType, bytes memory _composeData, uint256 _composeValue) internal view returns (PrepareLzCallReturn memory prepareLzCallReturn_) {
        uint256 minAmount = _amount - _amount * 1e4/1e5; 
        return usdoHelper.prepareLzCall(
            IUsdo(_token),
            PrepareLzCallData({
                dstEid: _dstEid,
                recipient: OFTMsgCodec.addressToBytes32(_recipient),
                amountToSendLD: _amount,
                minAmountToCreditLD: minAmount,
                msgType: _msgType,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: uint128(_composeValue),
                    data: _composeData,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
    }
    function _prepareAndExecuteCrossChainPackets(address _token, address _receivingToken, uint32 _dstEid, address _recipient, uint256 _amount, uint16 _msgType, bytes memory _composeData) internal {
        PrepareLzCallReturn memory _lzCallReturn = _prepareLzCall(_token, _dstEid, _recipient, _amount, _msgType, _composeData, 0);

        bytes memory composeMsg_ = _lzCallReturn.composeMsg;
        bytes memory oftMsgOptions_ = _lzCallReturn.oftMsgOptions;
        MessagingFee memory msgFee_ = _lzCallReturn.msgFee;
        LZSendParam memory lzSendParam_ = _lzCallReturn.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            Usdo(payable(_token)).sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(_dstEid, _receivingToken);

        __callLzCompose(
            LzOFTComposedData(
                _msgType,
                msgReceipt_.guid,
                sentMsg,
                _dstEid,
                _receivingToken, // Compose creator (at lzReceive)
                _receivingToken, // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );
    }

    function _prepareAndExecuteComposedCrossChainPackets(address _token, address _receivingToken, uint32 _srcEid, uint32 _dstEid, address _recipient, uint256 _amount, uint16 _msgType, bytes memory _composeData) internal {
        // usually for withdrawal
        PrepareLzCallReturn memory prepareLzCallReturn1_ = _prepareLzCall(_receivingToken, _srcEid, _recipient, _amount, SEND, "", 0);
        PrepareLzCallReturn memory prepareLzCallReturn2_ = _prepareLzCall(_token, _dstEid, _recipient, 0, _msgType, _composeData, prepareLzCallReturn1_.msgFee.nativeFee);

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            Usdo(payable(_token)).sendPacket{value: prepareLzCallReturn2_.msgFee.nativeFee}(prepareLzCallReturn2_.lzSendParam, prepareLzCallReturn2_.composeMsg);

        verifyPackets(_dstEid, _receivingToken); 

        __callLzCompose(
            LzOFTComposedData(
                _msgType,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                _receivingToken, // Compose creator (at lzReceive)
                _receivingToken, // Compose receiver (at lzCompose)
                _recipient,
                prepareLzCallReturn2_.oftMsgOptions
            )
        );
    }

    // *************** //
    // *** PRIVATE *** //
    // *************** //
    function _getYieldBoxDomainSeparator() private view returns (bytes32) {
        bytes32 typeHash =
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        bytes32 hashedName = keccak256(bytes("YieldBox"));
        bytes32 hashedVersion = keccak256(bytes("1"));
        bytes32 domainSeparator =
            keccak256(abi.encode(typeHash, hashedName, hashedVersion, block.chainid, address(yieldBox)));
        return domainSeparator;
    }
}