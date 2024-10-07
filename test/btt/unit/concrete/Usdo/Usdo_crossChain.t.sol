// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// LZ
import {
    SendParam,
    MessagingFee,
    MessagingReceipt,
    OFTReceipt
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";

// Tapioca
import {UsdoMarketReceiverModule} from "contracts/usdo/modules/UsdoMarketReceiverModule.sol";
import {MarketLendOrRepayMsg, MarketRemoveAssetMsg, YieldBoxApproveAllMsg, YieldBoxApproveAssetMsg, MarketPermitActionMsg} from "tap-utils/interfaces/oft/IUsdo.sol";

import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

import {ERC20PermitStruct, ERC20PermitApprovalMsg} from "tap-utils/interfaces/periph/ITapiocaOmnichainEngine.sol";
import {
    TapiocaOmnichainEngineHelper,
    PrepareLzCallData,
    PrepareLzCallReturn,
    ComposeMsgData,
    LZSendParam,
    RemoteTransferMsg
} from "tap-utils/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {IPearlmit, Pearlmit} from "tap-utils/pearlmit/Pearlmit.sol";

// tests
import {Singularity_Unit_Shared} from "../../shared/Singularity_Unit_Shared.t.sol";
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";
import {Usdo_Unit_Shared} from "../../shared/Usdo_Unit_Shared.t.sol";

contract Usdo_crossChain is Usdo_Unit_Shared, BigBang_Unit_Shared, Singularity_Unit_Shared {
    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public override(Usdo_Unit_Shared, BigBang_Unit_Shared, Singularity_Unit_Shared) {
        super.setUp();
    }
    function _approveForCollateral(address txExecutor) internal override(BigBang_Unit_Shared, Singularity_Unit_Shared) resetPrank(txExecutor) {
        _approveViaERC20(mainBB._collateral(), txExecutor, address(yieldBox), type(uint256).max);
        _approveViaERC20(mainBB._collateral(), txExecutor, address(pearlmit), type(uint256).max);
        _approveYieldBoxForAll(yieldBox, txExecutor, address(mainBB));
        _approveYieldBoxForAll(yieldBox, txExecutor, address(pearlmit));
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            txExecutor,
            address(mainBB),
            type(uint200).max,
            uint48(block.timestamp),
            mainBB._collateralId()
        );

        _approveViaERC20(secondaryBB._collateral(), txExecutor, address(yieldBox), type(uint256).max);
        _approveViaERC20(secondaryBB._collateral(), txExecutor, address(pearlmit), type(uint256).max);
        _approveYieldBoxForAll(yieldBox, txExecutor, address(secondaryBB));
        _approveYieldBoxForAll(yieldBox, txExecutor, address(pearlmit));
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            txExecutor,
            address(secondaryBB),
            type(uint200).max,
            uint48(block.timestamp),
            secondaryBB._collateralId()
        );
    }

    function test_WhenErc20ApprovalIsPerformedOnCurrentChain(uint256 amount) external assumeRange(amount, SMALL_AMOUNT, LARGE_AMOUNT) {
        ERC20PermitStruct memory permit_ = _createErc20PermitStruct(userA, userB, amount, 0);

        // get permit message
        bytes32 digest_ = usdo.getTypedDataHash(permit_);
        ERC20PermitApprovalMsg memory permitApproval_ =
            __getERC20PermitData(permit_, digest_, address(usdo), USER_A_PKEY);

        // call permit
        usdo.permit(
            permit_.owner,
            permit_.spender,
            permit_.value,
            permit_.deadline,
            permitApproval_.v,
            permitApproval_.r,
            permitApproval_.s
        );

        // it should increase allowance of main Usdo
        assertEq(usdo.allowance(userA, userB), amount);
        // it should increase nonce of main Usdo
        assertEq(usdo.nonces(userA), 1);
    }

    function test_WhenErc20ApprovalIsPerformedOnCrossChainLevel(uint256 amount) external assumeRange(amount, SMALL_AMOUNT, LARGE_AMOUNT) {
        cluster.setRoleForContract(address(secondaryUsdo),  keccak256("PERMIT_ERC20_CALLEE"), true);

        // create permit messages
        ERC20PermitApprovalMsg memory permitApprovalB_;
        ERC20PermitApprovalMsg memory permitApprovalC_; 
        bytes memory approvalsMsg_;

        {
            ERC20PermitStruct memory permitStructUserB = _createErc20PermitStruct(userA, userB, amount, 0);
            ERC20PermitStruct memory permitStructUserC = _createErc20PermitStruct(userA, userC, amount, 1); // nonce 1

            permitApprovalB_ = __getERC20PermitData(permitStructUserB, secondaryUsdo.getTypedDataHash(permitStructUserB), address(secondaryUsdo), USER_A_PKEY);
            permitApprovalC_ = __getERC20PermitData(permitStructUserC, secondaryUsdo.getTypedDataHash(permitStructUserC), address(secondaryUsdo), USER_A_PKEY);

            ERC20PermitApprovalMsg[] memory approvals_ = new ERC20PermitApprovalMsg[](2);
            approvals_[0] = permitApprovalB_;
            approvals_[1] = permitApprovalC_;

            approvalsMsg_ = usdoHelper.encodeERC20PermitApprovalMsg(approvals_);
        }

        _prepareAndExecuteCrossChainPackets(address(usdo), address(secondaryUsdo), bEid, address(this), 0, PT_APPROVALS, approvalsMsg_);
     
        // it should increase allowance of secondary Usdo for 2 users
        assertEq(secondaryUsdo.allowance(userA, userB), amount);
        assertEq(secondaryUsdo.allowance(userA, userC), amount);

        // it should increase nonce of secondary Usdo
        assertEq(secondaryUsdo.nonces(userA), 2);
    }



    function test_WhenRemoteTransferIsCalledFromSecondaryChain(uint256 amount) external assumeRange(amount, SMALL_AMOUNT, LARGE_AMOUNT) whenApprovedViaERC20(address(secondaryUsdo), address(this), address(secondaryUsdo), amount) {

        LZSendParam memory remoteLzSendParam_;
        MessagingFee memory remoteMsgFee_;
        {
            deal(address(secondaryUsdo), address(this), amount);

            PrepareLzCallReturn memory prepareLzCallReturn1_ = _prepareLzCall(address(secondaryUsdo), aEid, address(this), amount, SEND, "", 0);
            remoteLzSendParam_ = prepareLzCallReturn1_.lzSendParam;
            remoteMsgFee_ = prepareLzCallReturn1_.msgFee;
        }

        {
            RemoteTransferMsg memory remoteTransferData =
                RemoteTransferMsg({composeMsg: new bytes(0), owner: address(this), lzSendParam: remoteLzSendParam_});
            bytes memory remoteTransferMsg_ = usdoHelper.buildRemoteTransferMsg(remoteTransferData);

            PrepareLzCallReturn memory prepareLzCallReturn2_ = _prepareLzCall(address(usdo), bEid, address(this), 0, PT_REMOTE_TRANSFER, remoteTransferMsg_, remoteMsgFee_.nativeFee);
            bytes memory composeMsg_ = prepareLzCallReturn2_.composeMsg;
            bytes memory oftMsgOptions_ = prepareLzCallReturn2_.oftMsgOptions;
            MessagingFee memory msgFee_ = prepareLzCallReturn2_.msgFee;
            LZSendParam memory lzSendParam_ = prepareLzCallReturn2_.lzSendParam;

            (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
                usdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

            verifyPackets(uint32(bEid), address(secondaryUsdo)); 

            __callLzCompose(
                LzOFTComposedData(
                    PT_REMOTE_TRANSFER,
                    msgReceipt_.guid,
                    sentMsg,
                    bEid,
                    address(secondaryUsdo), // Compose creator (at lzReceive)
                    address(secondaryUsdo), // Compose receiver (at lzCompose)
                    address(this),
                    oftMsgOptions_
                )
            );
        }

        // it should increase local chain balance
        assertEq(usdo.balanceOf(address(this)), 0);
        verifyPackets(uint32(aEid), address(usdo)); // Verify B->A transfer
        assertApproxEqRel(usdo.balanceOf(address(this)), amount, 0.0001e18); // to pass over the LD to SD and SD to LD conversion
    }

    function test_whenCrossChainPermitOrRevokeIsTriggered_WhenPermitAllIsCalled() 
        external 
        // whenWhitelisted(address(yieldBox)) 
        whenWhitelisted(address(yieldBox), "PERMIT_YIELDBOX_CALLEE") 
    {
        _resetPrank(address(this));
        _crossChainApproveOrRevokeAll(true);

        // it should set approved for all on YieldBox
        assertEq(yieldBox.isApprovedForAll(address(userA), address(userB)), true);
    }

    function test_whenCrossChainPermitOrRevokeIsTriggered_WhenRevokeAllIsCalled() 
        external 
        // whenWhitelisted(address(yieldBox)) 
        whenWhitelisted(address(yieldBox), "PERMIT_YIELDBOX_CALLEE") 
        whenYieldBoxApprovedForAll(userA, userB) 
    {
        _resetPrank(address(this));
        _crossChainApproveOrRevokeAll(false);

        // it should revert approveall status on YieldBox
        assertEq(yieldBox.isApprovedForAll(address(userA), address(userB)), false);
    }

    function test_whenCrossChainPermitOrRevokeIsTriggered_WhenPermitIsCalled() 
        external 
        // whenWhitelisted(address(yieldBox)) 
        whenWhitelisted(address(yieldBox), "PERMIT_YIELDBOX_CALLEE") 
    {
        _crossChainYieldBoxPermitOrRevokeAsset(true);

        // it should set approval for the asset on YieldBox
        assertEq(yieldBox.isApprovedForAsset(address(userA), address(userB), usdoId), true);
    }

    function test_whenCrossChainPermitOrRevokeIsTriggered_WhenRevokeIsCalled() 
        external 
        // whenWhitelisted(address(yieldBox)) 
        whenWhitelisted(address(yieldBox), "PERMIT_YIELDBOX_CALLEE") 
        whenYieldBoxApprovedForAssetID(userA, userB, usdoId) 
    {
        _resetPrank(address(this));
        _crossChainYieldBoxPermitOrRevokeAsset(false);

        // it should revoke approval for asset on YieldBox
        assertEq(yieldBox.isApprovedForAsset(address(userA), address(userB), usdoId), false);
    }

    function test_whenMarketPermitIsCalled_WhenPermitAsset(uint256 amount) 
        external 
        assumeRange(amount, SMALL_AMOUNT, LARGE_AMOUNT) 
        // whenWhitelisted(address(secondaryUsdo)) 
        // whenWhitelisted(address(mainBB)) 
        whenWhitelisted(address(mainBB), "PERMIT_MARKET_CALLEE") 
        whenWhitelisted(address(mainBB), "USDO_MARKET_CALLEE") 
    {
        _marketPermit(amount, true);

        // it should increase market allowance for asset
        assertEq(mainBB.allowance(userA, userB), amount);
    }

    function test_whenMarketPermitIsCalled_WhenPermitCollateral(uint256 amount) 
        external 
        assumeRange(amount, SMALL_AMOUNT, LARGE_AMOUNT) 
        // whenWhitelisted(address(secondaryUsdo)) 
        // whenWhitelisted(address(mainBB)) 
        whenWhitelisted(address(mainBB), "PERMIT_MARKET_CALLEE") 
        whenWhitelisted(address(mainBB), "USDO_MARKET_CALLEE") 
    {
        _marketPermit(amount, false);

        // it should increase market allowance for collateral
        assertEq(mainBB.allowanceBorrow(userA, userB), amount);
    }


    function test_WhenRepayAndRemoveCollateralIsPerformed(uint256 collateralAmount, uint256 borrowAmount, uint256 repayPart)
        external
        whenContractIsNotPaused
        whenCollateralAmountIsValid(collateralAmount)
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        // whenWhitelisted(address(magnetar))
        // whenWhitelisted(address(marketHelper))
        // whenWhitelisted(address(mainBB))
        whenWhitelisted(address(magnetar), "USDO_MAGNETAR_CALLEE") 
        whenWhitelisted(address(marketHelper), "USDO_HELPER_CALLEE") 
        whenWhitelisted(address(mainBB), "USDO_MARKET_CALLEE") 
    {
        {
            borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
            // add collateral
            _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

            // borrow
            // already does the necessary checks
            _borrow(borrowAmount, mainBB, address(this), address(this), address(this));
        }

        repayPart = _boundRepayAmount(repayPart, mainBB);
        uint256 repayPercentage = repayPart * FEE_PRECISION / borrowAmount;
        uint256 removeCollateralAmount = repayPercentage * collateralAmount / FEE_PRECISION; 

        MarketLendOrRepayMsg memory marketMsg = _createMinimalLendOrRepayMsg(
            _LendOrRepayInternal({
                repay: true,
                lock: false,
                participate: false,
                removeCollateral: true,
                repayAmount: repayPart,
                depositAmount: 0,
                magnetar: address(magnetar),
                marketHelper: address(marketHelper),
                market: address(mainBB),
                removeCollateralAmount: removeCollateralAmount,
                lockDataTarget: address(0),
                participateDataTarget: address(0)
            })
        );
        _BorrowInternal memory _borrowData;
        _RemoveCollateralInternal memory _data;
        _data.userCollateralBefore = mainBB._userCollateralShare(address(this));
        _data.totalCollateralShareBefore = mainBB._totalCollateralShare();
        _borrowData.totalBorrowBefore = mainBB._totalBorrow();
        _borrowData.userBorrowPartBefore = mainBB._userBorrowPart(address(this));

        // approvals
        {
            mainBB.approveBorrow(address(magnetar), type(uint256).max);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(mainBB), type(uint200).max, block.timestamp, usdoId);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, mainBB._collateralId());
            _approveViaPearlmit(TOKEN_TYPE_ERC20, address(mainBB), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveYieldBoxForAll({yieldBox: yieldBox, from: address(this), operator: address(pearlmit)});
        }

        _prepareAndExecuteComposedCrossChainPackets(address(usdo), address(secondaryUsdo), aEid, bEid, address(this), 0, PT_YB_SEND_SGL_LEND_OR_REPAY, usdoHelper.buildMarketLendOrRepayMsg(marketMsg));

        _data.userCollateralAfter = mainBB._userCollateralShare(address(this));
        _data.totalCollateralShareAfter = mainBB._totalCollateralShare();
        _borrowData.totalBorrowAfter = mainBB._totalBorrow();
        _borrowData.userBorrowPartAfter = mainBB._userBorrowPart(address(this));

        // it should decrease userCollateralShare
        assertGt(_data.userCollateralBefore, _data.userCollateralAfter);
        // it should decrease totalCollateralShare
        assertGt(_data.totalCollateralShareBefore, _data.totalCollateralShareAfter);
        // it should decrease userBorrowPart
        assertGt(_borrowData.userBorrowPartBefore, _borrowData.userBorrowPartAfter);
        // it should decrease totalBorrow
        assertGt(_borrowData.totalBorrowBefore.base, _borrowData.totalBorrowAfter.base);
        assertGt(_borrowData.totalBorrowBefore.elastic, _borrowData.totalBorrowAfter.elastic);
    }

    function test_whenRemoveAssetIsCalledCrossChain_WhenMagnetarIsAvailable(uint256 collateralAmount)  external
        whenContractIsNotPaused
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        whenCollateralAmountIsValid(collateralAmount)
        whenWhitelisted(address(randomSgl), "USDO_MARKET_CALLEE") 
        whenWhitelisted(address(randomSgl), "MAGNETAR_MARKET_CALLEE") 
    {
        uint256 repayPart;
        uint256 removeCollateralAmount = collateralAmount * 1e4/1e5; //remove 10%
        // BigBang section - to obtain Usdo
        {
            uint256 minLendAmount = randomSgl.minLendAmount() + 1;
             // **** Add collateral ****
            _addCollateral(collateralAmount, mainBB, address(this), address(this), address(this), address(this), false);

            uint256 borrowAmount = minLendAmount * 2;
            repayPart = minLendAmount;

             // **** Borrow ****
            _borrow(borrowAmount, mainBB, address(this), address(this), address(this));

        }

        uint256 lendAmount = repayPart;
        uint256 removeAmount = lendAmount/4;

        MarketRemoveAssetMsg memory marketMsg = _createMinimalRemoveAssetMsg(
            _RemoveAssetInternal({
                magnetar: address(magnetar),
                marketHelper: address(marketHelper),
                market: address(randomSgl),
                removeAmount: removeAmount,
                repayAmount: repayPart - 1,
                removeCollateralAmount: removeCollateralAmount,
                bb: address(mainBB)
            })
        );
        // approvals
        {
            mainBB.approveBorrow(address(magnetar), type(uint256).max);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(mainBB), type(uint200).max, block.timestamp, usdoId);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, mainBB._collateralId());
            _approveViaPearlmit(TOKEN_TYPE_ERC20, address(mainBB), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveYieldBoxForAll({yieldBox: yieldBox, from: address(this), operator: address(pearlmit)});

            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(randomSgl), type(uint200).max, block.timestamp, usdoId);
            _approveViaPearlmit(TOKEN_TYPE_ERC20, address(randomSgl), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
        }

        // add asset
        uint256 lendShare = yieldBox.toShare(usdoId, lendAmount, false);
        randomSgl.addAsset(address(this), address(this), false, lendShare);

        uint256 balanceBefore = randomSgl.balanceOf(address(this));
        uint256 supplyBefore = randomSgl.totalSupply();
        uint256 userSupplyBefore = yieldBox.balanceOf(address(this), mainBB._collateralId());

        _prepareAndExecuteComposedCrossChainPackets(address(usdo), address(secondaryUsdo), aEid, bEid, address(this), 0, PT_MARKET_REMOVE_ASSET, usdoHelper.buildMarketRemoveAssetMsg(marketMsg));

        uint256 balanceAfter = randomSgl.balanceOf(address(this));
        uint256 supplyAfter = randomSgl.totalSupply();
        uint256 userSupplyAfter = yieldBox.balanceOf(address(this), mainBB._collateralId());

        // it should remove asset from market
        assertGt(balanceBefore, balanceAfter);
        // it should decrease market supply
        assertGt(supplyBefore, supplyAfter);
        // it should transfer asset to user
        assertGt(userSupplyAfter, userSupplyBefore);
    }

    // *************** //
    // *** PRIVATE *** //
    // *************** //
    function _marketPermit(uint256 amount, bool permit) private {
        cluster.setRoleForContract(address(mainBB),  keccak256("PERMIT_MARKET_CALLEE"), true);
        cluster.setRoleForContract(address(secondaryUsdo),  keccak256("MARKET_PERMIT"), true);

        bytes memory approvalMsg_;
        {
            MarketPermitActionMsg memory approvalUserB_ = MarketPermitActionMsg({
                target: address(mainBB),
                owner: userA,
                spender: userB,
                value: amount,
                deadline: 1 days,
                v: 0,
                r: 0,
                s: 0,
                permitAsset: permit
            });
            bytes32 digest_ = _getMarketPermitTypedDataHash(permit, userA, userB, amount, 1 days, 0, mainBB.DOMAIN_SEPARATOR());
            MarketPermitActionMsg memory permitApproval_ = __getMarketPermitData(approvalUserB_, digest_, USER_A_PKEY);

            approvalMsg_ = usdoHelper.buildMarketPermitApprovalMsg(permitApproval_);
        }

        _prepareAndExecuteCrossChainPackets(address(usdo), address(secondaryUsdo), bEid, address(this), 0, PT_MARKET_PERMIT, approvalMsg_);
    }

    function _crossChainApproveOrRevokeAll(bool approve) private {
        cluster.setRoleForContract(address(yieldBox), keccak256("PERMIT_YIELDBOX_CALLEE"), true);

        bytes memory approvalMsg_;
        {
            ERC20PermitStruct memory approvalUserB_ = _createErc20PermitStruct(userA, userB, 0, 0);

            bytes32 digest_ = _getYieldBoxPermitAllTypedDataHash(approvalUserB_, approve);
            YieldBoxApproveAllMsg memory permitApproval_ =
                __getYieldBoxPermitAllData(approvalUserB_, address(yieldBox), approve, digest_, USER_A_PKEY);

            approvalMsg_ = usdoHelper.buildYieldBoxApproveAllMsg(permitApproval_);
        }

        _prepareAndExecuteCrossChainPackets(address(usdo), address(secondaryUsdo), bEid, address(this), 0, PT_YB_APPROVE_ALL, approvalMsg_);
    }

    function _crossChainYieldBoxPermitOrRevokeAsset(bool approve) private {
        cluster.setRoleForContract(address(yieldBox), keccak256("PERMIT_YIELDBOX_CALLEE"), true);

        bytes memory approvalMsg_;
        {
            ERC20PermitStruct memory approvalUserB_ = _createErc20PermitStruct(userA, userB, usdoId, 0);
            YieldBoxApproveAssetMsg memory permitApprovalB_ = __getYieldBoxPermitAssetData(
                approvalUserB_,
                address(yieldBox),
                approve,
                _getYieldBoxPermitAssetTypedDataHash(approvalUserB_, approve),
                USER_A_PKEY
            );
            
            YieldBoxApproveAssetMsg[] memory approvals_ = new YieldBoxApproveAssetMsg[](1);
            approvals_[0] = permitApprovalB_;

            approvalMsg_ = usdoHelper.buildYieldBoxApproveAssetMsg(approvals_);
        }
        _prepareAndExecuteCrossChainPackets(address(usdo), address(secondaryUsdo), bEid, address(this), 0, PT_YB_APPROVE_ASSET, approvalMsg_);
    }
}
