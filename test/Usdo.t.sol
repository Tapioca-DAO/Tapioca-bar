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

// External
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// Tapioca
import {
    IMagnetar,
    DepositRepayAndRemoveCollateralFromMarketData,
    MintFromBBAndLendOnSGLData,
    ExitPositionAndRemoveCollateralData,
    DepositAddCollateralAndBorrowFromMarketData,
    MagnetarWithdrawData
} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {
    ITapiocaOptionBroker,
    IExerciseOptionsData,
    IOptionsParticipateData
} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {
    TapiocaOmnichainEngineHelper,
    PrepareLzCallData,
    PrepareLzCallReturn,
    ComposeMsgData,
    LZSendParam,
    RemoteTransferMsg
} from "tapioca-periph/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {
    IUsdo,
    UsdoInitStruct,
    UsdoModulesInitStruct,
    ExerciseOptionsMsg,
    YieldBoxApproveAssetMsg,
    YieldBoxApproveAllMsg,
    MarketPermitActionMsg,
    MarketRemoveAssetMsg,
    IRemoveAndRepay,
    MarketLendOrRepayMsg,
    IRemoveAndRepay,
    ILendOrRepayParams
} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {
    ITapiocaOptionLiquidityProvision,
    IOptionsLockData,
    IOptionsUnlockData
} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionLiquidityProvision.sol";
import {ERC20PermitStruct, ERC20PermitApprovalMsg} from "tapioca-periph/interfaces/periph/ITapiocaOmnichainEngine.sol";
import {TapiocaOmnichainExtExec} from "tapioca-periph/tapiocaOmnichainEngine/extension/TapiocaOmnichainExtExec.sol";
import {IOptionsExitData} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {UsdoMarketReceiverModule} from "contracts/usdo/modules/UsdoMarketReceiverModule.sol";
import {UsdoOptionReceiverModule} from "contracts/usdo/modules/UsdoOptionReceiverModule.sol";
import {SimpleLeverageExecutor} from "contracts/markets/leverage/SimpleLeverageExecutor.sol";
import {ICommonExternalContracts} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {ICommonData} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {Pearlmit, IPearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {UsdoReceiver} from "contracts/usdo/modules/UsdoReceiver.sol";
import {IOracle} from "tapioca-periph/oracle/interfaces/IOracle.sol";
import {UsdoHelper} from "contracts/usdo/extensions/UsdoHelper.sol";
import {UsdoSender} from "contracts/usdo/modules/UsdoSender.sol";
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {Penrose} from "contracts/Penrose.sol";

// Tapioca Tests
import {UsdoTestHelper, TestPenroseData, TestSingularityData} from "./helpers/UsdoTestHelper.t.sol";
import {TapiocaOptionsBrokerMock, OTapMock} from "./mocks/TapiocaOptionsBrokerMock.sol";
import {MagnetarMock} from "./mocks/MagnetarMock.sol";
import {SwapperMock} from "./mocks/SwapperMock.sol";
import {OracleMock} from "./mocks/OracleMock.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {UsdoMock} from "./mocks/UsdoMock.sol";

import {TapiocaOmnichainEngineCodec} from "tapioca-periph/tapiocaOmnichainEngine/TapiocaOmnichainEngineCodec.sol";

import "forge-std/Test.sol";

contract UsdoTest is UsdoTestHelper {
    using OptionsBuilder for bytes;
    using OFTMsgCodec for bytes32;
    using OFTMsgCodec for bytes;

    uint32 aEid = 1;
    uint32 bEid = 2;

    Pearlmit pearlmit;
    Cluster cluster;
    YieldBox yieldBox;
    ERC20Mock tapOFT;
    ERC20Mock weth;

    UsdoMock aUsdo; //collateral
    UsdoMock bUsdo; //asset

    MagnetarMock magnetar;

    UsdoHelper usdoHelper;

    TapiocaOptionsBrokerMock tOB;

    SwapperMock swapper;
    Penrose penrose;
    SimpleLeverageExecutor leverageExecutor;
    Singularity masterContract;
    Singularity singularity;
    MarketHelper marketHelper;
    OracleMock oracle;

    ERC20WithoutStrategy aUsdoStrategy;
    ERC20WithoutStrategy bUsdoStrategy;

    uint256 aUsdoYieldBoxId;
    uint256 bUsdoYieldBoxId;

    uint256 internal userAPKey = 0x1;
    uint256 internal userBPKey = 0x2;
    address public userA = vm.addr(userAPKey);
    address public userB = vm.addr(userBPKey);
    uint256 public initialBalance = 100 ether;

    /**
     * DEPLOY setup addresses
     */
    address __endpoint;
    uint256 __hostEid = aEid;
    address __owner = address(this);

    uint16 internal constant SEND = 1; // Send LZ message type
    uint16 internal constant PT_APPROVALS = 500; // Use for ERC20Permit approvals
    uint16 internal constant PT_YB_APPROVE_ASSET = 503; // Use for YieldBox 'setApprovalForAsset(true)' operation
    uint16 internal constant PT_YB_APPROVE_ALL = 504; // Use for YieldBox 'setApprovalForAll(true)' operation
    uint16 internal constant PT_MARKET_PERMIT = 505; // Use for market.permitLend() operation
    uint16 internal constant PT_REMOTE_TRANSFER = 700; // Use for transferring tokens from the contract from another chain
    uint16 internal constant PT_MARKET_REMOVE_ASSET = 900; // Use for remove asset from a market available on another chain
    uint16 internal constant PT_YB_SEND_SGL_LEND_OR_REPAY = 901; // Use to YB deposit, lend/repay on a market available on another chain
    uint16 internal constant PT_TAP_EXERCISE = 902; // Use for exercise options on tOB available on another chain

    /**
     * @dev TOFT global event checks
     */
    event OFTReceived(bytes32, address, uint256, uint256);
    event ComposeReceived(uint16 indexed msgType, bytes32 indexed guid, bytes composeMsg);

    function setUp() public override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);
        vm.label(userA, "userA");
        vm.label(userB, "userB");

        tapOFT = new ERC20Mock("Tapioca OFT", "TAP");
        vm.label(address(tapOFT), "tapOFT");

        weth = new ERC20Mock("Wrapped Ethereum", "WETH");
        vm.label(address(weth), "WETH");

        marketHelper = new MarketHelper();

        setUpEndpoints(3, LibraryType.UltraLightNode);

        {
            pearlmit = new Pearlmit("Pearlmit", "1", address(this), 0);
            yieldBox = createYieldBox(pearlmit, address(this));
            cluster = createCluster(aEid, __owner);
            magnetar = createMagnetar(address(cluster), IPearlmit(address(pearlmit)));

            vm.label(address(endpoints[aEid]), "aEndpoint");
            vm.label(address(endpoints[bEid]), "bEndpoint");
            vm.label(address(yieldBox), "YieldBox");
            vm.label(address(cluster), "Cluster");
            vm.label(address(magnetar), "Magnetar");
            vm.label(address(pearlmit), "Pearlmit");
        }

        TapiocaOmnichainExtExec extExec = new TapiocaOmnichainExtExec();
        vm.label(address(extExec), "TapiocaOmnichainExtExec");

        UsdoInitStruct memory aUsdoInitStruct = UsdoInitStruct({
            endpoint: address(endpoints[aEid]),
            delegate: __owner,
            yieldBox: address(yieldBox),
            cluster: address(cluster),
            extExec: address(extExec),
            pearlmit: IPearlmit(address(pearlmit))
        });
        UsdoSender aUsdoSender = new UsdoSender(aUsdoInitStruct);
        UsdoReceiver aUsdoReceiver = new UsdoReceiver(aUsdoInitStruct);
        UsdoMarketReceiverModule aUsdoMarketReceiverModule = new UsdoMarketReceiverModule(aUsdoInitStruct);
        UsdoOptionReceiverModule aUsdoOptionsReceiverModule = new UsdoOptionReceiverModule(aUsdoInitStruct);
        vm.label(address(aUsdoSender), "aUsdoSender");
        vm.label(address(aUsdoReceiver), "aUsdoReceiver");
        vm.label(address(aUsdoMarketReceiverModule), "aUsdoMarketReceiverModule");
        vm.label(address(aUsdoOptionsReceiverModule), "aUsdoOptionsReceiverModule");

        UsdoModulesInitStruct memory aUsdoModulesInitStruct = UsdoModulesInitStruct({
            usdoSenderModule: address(aUsdoSender),
            usdoReceiverModule: address(aUsdoReceiver),
            marketReceiverModule: address(aUsdoMarketReceiverModule),
            optionReceiverModule: address(aUsdoOptionsReceiverModule)
        });
        aUsdo = UsdoMock(
            payable(_deployOApp(type(UsdoMock).creationCode, abi.encode(aUsdoInitStruct, aUsdoModulesInitStruct)))
        );
        vm.label(address(aUsdo), "aUsdo");

        UsdoInitStruct memory bUsdoInitStruct = UsdoInitStruct({
            endpoint: address(endpoints[bEid]),
            delegate: __owner,
            yieldBox: address(yieldBox),
            cluster: address(cluster),
            extExec: address(extExec),
            pearlmit: IPearlmit(address(pearlmit))
        });
        UsdoSender bUsdoSender = new UsdoSender(bUsdoInitStruct);
        UsdoReceiver bUsdoReceiver = new UsdoReceiver(bUsdoInitStruct);
        UsdoMarketReceiverModule bUsdoMarketReceiverModule = new UsdoMarketReceiverModule(bUsdoInitStruct);
        UsdoOptionReceiverModule bUsdoOptionsReceiverModule = new UsdoOptionReceiverModule(bUsdoInitStruct);
        vm.label(address(bUsdoSender), "bUsdoSender");
        vm.label(address(bUsdoReceiver), "bUsdoReceiver");
        vm.label(address(bUsdoMarketReceiverModule), "bUsdoMarketReceiverModule");
        vm.label(address(bUsdoOptionsReceiverModule), "bUsdoOptionsReceiverModule");

        UsdoModulesInitStruct memory bUsdoModulesInitStruct = UsdoModulesInitStruct({
            usdoSenderModule: address(bUsdoSender),
            usdoReceiverModule: address(bUsdoReceiver),
            marketReceiverModule: address(bUsdoMarketReceiverModule),
            optionReceiverModule: address(bUsdoOptionsReceiverModule)
        });
        bUsdo = UsdoMock(
            payable(_deployOApp(type(UsdoMock).creationCode, abi.encode(bUsdoInitStruct, bUsdoModulesInitStruct)))
        );
        vm.label(address(bUsdo), "bUsdo");

        usdoHelper = new UsdoHelper();
        vm.label(address(usdoHelper), "usdoHelper");

        // config and wire the ofts
        address[] memory ofts = new address[](2);
        ofts[0] = address(aUsdo);
        ofts[1] = address(bUsdo);
        this.wireOApps(ofts);

        // Setup YieldBox assets
        aUsdoStrategy = createYieldBoxEmptyStrategy(address(yieldBox), address(aUsdo));
        bUsdoStrategy = createYieldBoxEmptyStrategy(address(yieldBox), address(bUsdo));

        aUsdoYieldBoxId = registerYieldBoxAsset(address(yieldBox), address(aUsdo), address(aUsdoStrategy)); //we assume this is the asset Id
        bUsdoYieldBoxId = registerYieldBoxAsset(address(yieldBox), address(bUsdo), address(bUsdoStrategy)); //we assume this is the collateral Id

        tOB = new TapiocaOptionsBrokerMock(address(tapOFT), IPearlmit(address(pearlmit)));

        swapper = createSwapper(yieldBox);
        leverageExecutor =
            createLeverageExecutor(address(yieldBox), address(swapper), address(cluster), address(pearlmit));
        (penrose, masterContract) = createPenrose(
            TestPenroseData(
                address(yieldBox),
                address(cluster),
                address(tapOFT),
                address(weth),
                IPearlmit(address(pearlmit)),
                __owner
            )
        );
        oracle = createOracle();
        singularity = createSingularity(
            penrose,
            TestSingularityData(
                address(penrose),
                IERC20(address(bUsdo)), //asset
                bUsdoYieldBoxId,
                IERC20(address(aUsdo)), //collateral
                aUsdoYieldBoxId,
                IOracle(address(oracle)),
                ILeverageExecutor(address(leverageExecutor))
            ),
            address(masterContract)
        );
        vm.label(address(singularity), "Singularity");

        cluster.updateContract(aEid, address(yieldBox), true);
        cluster.updateContract(aEid, address(magnetar), true);
        cluster.updateContract(aEid, address(tOB), true);
        cluster.updateContract(aEid, address(swapper), true);
        cluster.updateContract(aEid, address(penrose), true);
        cluster.updateContract(aEid, address(masterContract), true);
        cluster.updateContract(aEid, address(oracle), true);
        cluster.updateContract(aEid, address(singularity), true);
        cluster.updateContract(aEid, address(marketHelper), true);

        cluster.updateContract(bEid, address(yieldBox), true);
        cluster.updateContract(bEid, address(magnetar), true);
        cluster.updateContract(bEid, address(tOB), true);
        cluster.updateContract(bEid, address(swapper), true);
        cluster.updateContract(bEid, address(penrose), true);
        cluster.updateContract(bEid, address(masterContract), true);
        cluster.updateContract(bEid, address(oracle), true);
        cluster.updateContract(bEid, address(singularity), true);
        cluster.updateContract(bEid, address(marketHelper), true);
    }

    /**
     * =================
     *      HELPERS
     * =================
     */

    /**
     * @dev Used to bypass stack too deep
     *
     * @param msgType The message type of the lz Compose.
     * @param guid The message GUID.
     * @param composeMsg The source raw OApp compose message. If compose msg is composed with other msgs,
     * the msg should contain only the compose msg at its index and forward. I.E composeMsg[currentIndex:]
     * @param dstEid The destination EID.
     * @param from The address initiating the composition, typically the OApp where the lzReceive was called.
     * @param to The address of the lzCompose receiver.
     * @param srcMsgSender The address of src EID OFT `msg.sender` call initiator .
     * @param extraOptions The options passed in the source OFT call. Only restriction is to have it contain the actual compose option for the index,
     * whether there are other composed calls or not.
     */
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
    /**
     * @notice Call lzCompose on the destination OApp.
     *
     * @dev Be sure to verify the message by calling `TestHelper.verifyPackets()`.
     * @dev Will internally verify the emission of the `ComposeReceived` event with
     * the right msgType, GUID and lzReceive composer message.
     *
     * @param _lzOFTComposedData The data to pass to the lzCompose call.
     */

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

    function test_constructor() public {
        assertEq(address(aUsdo.yieldBox()), address(yieldBox));
        assertEq(address(aUsdo.getCluster()), address(cluster));
    }

    function test_erc20_permit() public {
        ERC20PermitStruct memory permit_ =
            ERC20PermitStruct({owner: userA, spender: userB, value: 1e18, nonce: 0, deadline: 1 days});

        bytes32 digest_ = aUsdo.getTypedDataHash(permit_);
        ERC20PermitApprovalMsg memory permitApproval_ =
            __getERC20PermitData(permit_, digest_, address(aUsdo), userAPKey);

        aUsdo.permit(
            permit_.owner,
            permit_.spender,
            permit_.value,
            permit_.deadline,
            permitApproval_.v,
            permitApproval_.r,
            permitApproval_.s
        );
        assertEq(aUsdo.allowance(userA, userB), 1e18);
        assertEq(aUsdo.nonces(userA), 1);
    }

    /**
     * ERC20 APPROVALS
     */
    function test_usdo_erc20_approvals() public {
        address userC_ = vm.addr(0x3);

        cluster.updateContract(0, address(bUsdo), true);

        ERC20PermitApprovalMsg memory permitApprovalB_;
        ERC20PermitApprovalMsg memory permitApprovalC_;
        bytes memory approvalsMsg_;

        {
            ERC20PermitStruct memory approvalUserB_ =
                ERC20PermitStruct({owner: userA, spender: userB, value: 1e18, nonce: 0, deadline: 1 days});
            ERC20PermitStruct memory approvalUserC_ = ERC20PermitStruct({
                owner: userA,
                spender: userC_,
                value: 2e18,
                nonce: 1, // Nonce is 1 because we already called permit() on userB
                deadline: 2 days
            });

            permitApprovalB_ =
                __getERC20PermitData(approvalUserB_, bUsdo.getTypedDataHash(approvalUserB_), address(bUsdo), userAPKey);

            permitApprovalC_ =
                __getERC20PermitData(approvalUserC_, bUsdo.getTypedDataHash(approvalUserC_), address(bUsdo), userAPKey);

            ERC20PermitApprovalMsg[] memory approvals_ = new ERC20PermitApprovalMsg[](2);
            approvals_[0] = permitApprovalB_;
            approvals_[1] = permitApprovalC_;

            approvalsMsg_ = usdoHelper.encodeERC20PermitApprovalMsg(approvals_);
        }

        PrepareLzCallReturn memory prepareLzCallReturn_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_APPROVALS,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: 0,
                    data: approvalsMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn_.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(uint32(bEid), address(bUsdo));

        vm.expectEmit(true, true, true, false);
        emit IERC20.Approval(userA, userB, 1e18);

        vm.expectEmit(true, true, true, false);
        emit IERC20.Approval(userA, userC_, 1e18);

        __callLzCompose(
            LzOFTComposedData(
                PT_APPROVALS,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                address(bUsdo), // Compose creator (at lzReceive)
                address(bUsdo), // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );

        assertEq(bUsdo.allowance(userA, userB), 1e18);
        assertEq(bUsdo.allowance(userA, userC_), 2e18);
        assertEq(bUsdo.nonces(userA), 2);
    }

    function test_remote_transfer() public {
        // vars
        uint256 tokenAmount_ = 1 ether;
        LZSendParam memory remoteLzSendParam_;
        MessagingFee memory remoteMsgFee_; // Will be used as value for the composed msg

        /**
         * Setup
         */
        {
            deal(address(bUsdo), address(this), tokenAmount_);

            // @dev `remoteMsgFee_` is to be airdropped on dst to pay for the `remoteTransfer` operation (B->A).
            PrepareLzCallReturn memory prepareLzCallReturn1_ = usdoHelper.prepareLzCall( // B->A data
                IUsdo(address(bUsdo)),
                PrepareLzCallData({
                    dstEid: aEid,
                    recipient: OFTMsgCodec.addressToBytes32(address(this)),
                    amountToSendLD: tokenAmount_,
                    minAmountToCreditLD: tokenAmount_,
                    msgType: SEND,
                    composeMsgData: ComposeMsgData({
                        index: 0,
                        gas: 0,
                        value: 0,
                        data: bytes(""),
                        prevData: bytes(""),
                        prevOptionsData: bytes("")
                    }),
                    lzReceiveGas: 500_000,
                    lzReceiveValue: 0,
                    refundAddress: address(this)
                })
            );
            remoteLzSendParam_ = prepareLzCallReturn1_.lzSendParam;
            remoteMsgFee_ = prepareLzCallReturn1_.msgFee;
        }

        /**
         * Actions
         */
        RemoteTransferMsg memory remoteTransferData =
            RemoteTransferMsg({composeMsg: new bytes(0), owner: address(this), lzSendParam: remoteLzSendParam_});
        bytes memory remoteTransferMsg_ = usdoHelper.buildRemoteTransferMsg(remoteTransferData);

        PrepareLzCallReturn memory prepareLzCallReturn2_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_REMOTE_TRANSFER,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 500_000,
                    value: uint128(remoteMsgFee_.nativeFee),
                    data: remoteTransferMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 500_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn2_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn2_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn2_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn2_.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        {
            verifyPackets(uint32(bEid), address(bUsdo));

            // Initiate approval
            bUsdo.approve(address(bUsdo), tokenAmount_); // Needs to be pre approved on B chain to be able to transfer

            __callLzCompose(
                LzOFTComposedData(
                    PT_REMOTE_TRANSFER,
                    msgReceipt_.guid,
                    sentMsg,
                    bEid,
                    address(bUsdo), // Compose creator (at lzReceive)
                    address(bUsdo), // Compose receiver (at lzCompose)
                    address(this),
                    oftMsgOptions_
                )
            );
        }

        // Check arrival
        {
            assertEq(aUsdo.balanceOf(address(this)), 0);
            verifyPackets(uint32(aEid), address(aUsdo)); // Verify B->A transfer
            assertEq(aUsdo.balanceOf(address(this)), tokenAmount_);
        }
    }

    function test_exercise_option() public {
        uint256 erc20Amount_ = 1 ether;

        address oTapMock = tOB.oTapMock();
        OTapMock(oTapMock).setOwner(address(this));

        //setup
        {
            deal(address(aUsdo), address(this), erc20Amount_);

            // @dev send TAP to tOB
            deal(address(tapOFT), address(tOB), erc20Amount_);

            // @dev set `paymentTokenAmount` on `tOB`
            tOB.setPaymentTokenAmount(erc20Amount_);
        }

        pearlmit.approve(721, tOB.oTAP(), 0, address(magnetar), type(uint200).max, uint48(block.timestamp));
        pearlmit.approve(721, tOB.oTAP(), 0, address(bUsdo), type(uint200).max, uint48(block.timestamp));

        //useful in case of withdraw after borrow
        LZSendParam memory withdrawLzSendParam_;
        MessagingFee memory withdrawMsgFee_; // Will be used as value for the composed msg

        {
            // @dev `withdrawMsgFee_` is to be airdropped on dst to pay for the send to source operation (B->A).
            PrepareLzCallReturn memory prepareLzCallReturn1_ = usdoHelper.prepareLzCall( // B->A data
                IUsdo(address(bUsdo)),
                PrepareLzCallData({
                    dstEid: aEid,
                    recipient: OFTMsgCodec.addressToBytes32(address(this)),
                    amountToSendLD: erc20Amount_,
                    minAmountToCreditLD: erc20Amount_,
                    msgType: SEND,
                    composeMsgData: ComposeMsgData({
                        index: 0,
                        gas: 0,
                        value: 0,
                        data: bytes(""),
                        prevData: bytes(""),
                        prevOptionsData: bytes("")
                    }),
                    lzReceiveGas: 500_000,
                    lzReceiveValue: 0,
                    refundAddress: address(this)
                })
            );
            withdrawLzSendParam_ = prepareLzCallReturn1_.lzSendParam;
            withdrawMsgFee_ = prepareLzCallReturn1_.msgFee;
        }

        /**
         * Actions
         */
        uint256 tokenAmountSD = usdoHelper.toSD(erc20Amount_, aUsdo.decimalConversionRate());

        //approve magnetar
        ExerciseOptionsMsg memory exerciseMsg = ExerciseOptionsMsg({
            optionsData: IExerciseOptionsData({
                from: address(this),
                target: address(tOB),
                paymentTokenAmount: tokenAmountSD,
                oTAPTokenID: 0, // @dev ignored in TapiocaOptionsBrokerMock
                tapAmount: tokenAmountSD
            }),
            withdrawOnOtherChain: false,
            lzSendParams: LZSendParam({
                sendParam: SendParam({
                    dstEid: 0,
                    to: "0x",
                    amountLD: 0,
                    minAmountLD: 0,
                    extraOptions: "0x",
                    composeMsg: "0x",
                    oftCmd: "0x"
                }),
                fee: MessagingFee({nativeFee: 0, lzTokenFee: 0}),
                extraOptions: "0x",
                refundAddress: address(this)
            })
        });
        bytes memory sendMsg_ = usdoHelper.buildExerciseOptionMsg(exerciseMsg);

        PrepareLzCallReturn memory prepareLzCallReturn2_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: erc20Amount_,
                minAmountToCreditLD: erc20Amount_,
                msgType: PT_TAP_EXERCISE,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 500_000,
                    value: uint128(withdrawMsgFee_.nativeFee),
                    data: sendMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 500_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn2_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn2_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn2_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn2_.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        {
            verifyPackets(uint32(bEid), address(bUsdo));

            __callLzCompose(
                LzOFTComposedData(
                    PT_TAP_EXERCISE,
                    msgReceipt_.guid,
                    sentMsg,
                    bEid,
                    address(bUsdo), // Compose creator (at lzReceive)
                    address(bUsdo), // Compose receiver (at lzCompose)
                    address(this),
                    oftMsgOptions_
                )
            );
        }

        // Check execution
        {
            // @dev TapiocaOptionsBrokerMock uses 90% of msg.options.paymentTokenAmount
            // @dev we check for the rest (10%) if it was returned
            // assertEq(bUsdo.balanceOf(address(this)), erc20Amount_ * 1e4 / 1e5, "USDO");

            assertEq(tapOFT.balanceOf(address(this)), erc20Amount_, "TapOFT");
        }
    }

    function test_usdo_yb_permit_all() public {
        bytes memory approvalMsg_;
        {
            ERC20PermitStruct memory approvalUserB_ =
                ERC20PermitStruct({owner: userA, spender: userB, value: 0, nonce: 0, deadline: 1 days});

            bytes32 digest_ = _getYieldBoxPermitAllTypedDataHash(approvalUserB_, true);
            YieldBoxApproveAllMsg memory permitApproval_ =
                __getYieldBoxPermitAllData(approvalUserB_, address(yieldBox), true, digest_, userAPKey);

            approvalMsg_ = usdoHelper.buildYieldBoxApproveAllMsg(permitApproval_);
        }

        PrepareLzCallReturn memory prepareLzCallReturn_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_YB_APPROVE_ALL,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: 0,
                    data: approvalMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn_.lzSendParam;

        assertEq(yieldBox.isApprovedForAll(address(userA), address(userB)), false);

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(uint32(bEid), address(bUsdo));

        __callLzCompose(
            LzOFTComposedData(
                PT_YB_APPROVE_ALL,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                address(bUsdo), // Compose creator (at lzReceive)
                address(bUsdo), // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );

        assertEq(yieldBox.isApprovedForAll(address(userA), address(userB)), true);
        assertEq(yieldBox.isApprovedForAll(address(userA), address(this)), false);
    }

    function test_usdo_yb_revoke_all() public {
        bytes memory approvalMsg_;
        {
            ERC20PermitStruct memory approvalUserB_ =
                ERC20PermitStruct({owner: userA, spender: userB, value: 0, nonce: 0, deadline: 1 days});

            bytes32 digest_ = _getYieldBoxPermitAllTypedDataHash(approvalUserB_, false);
            YieldBoxApproveAllMsg memory permitApproval_ =
                __getYieldBoxPermitAllData(approvalUserB_, address(yieldBox), false, digest_, userAPKey);

            approvalMsg_ = usdoHelper.buildYieldBoxApproveAllMsg(permitApproval_);
        }

        PrepareLzCallReturn memory prepareLzCallReturn_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_YB_APPROVE_ALL,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: 0,
                    data: approvalMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn_.lzSendParam;

        vm.prank(address(userA));
        yieldBox.setApprovalForAll(address(userB), true);
        assertEq(yieldBox.isApprovedForAll(address(userA), address(userB)), true);

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(uint32(bEid), address(bUsdo));

        __callLzCompose(
            LzOFTComposedData(
                PT_YB_APPROVE_ALL,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                address(bUsdo), // Compose creator (at lzReceive)
                address(bUsdo), // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );

        assertEq(yieldBox.isApprovedForAll(address(userA), address(userB)), false);
    }

    function test_usdo_yb_permit_asset() public {
        YieldBoxApproveAssetMsg memory permitApprovalB_;
        YieldBoxApproveAssetMsg memory permitApprovalC_;
        bytes memory approvalsMsg_;

        {
            ERC20PermitStruct memory approvalUserB_ =
                ERC20PermitStruct({owner: userA, spender: userB, value: aUsdoYieldBoxId, nonce: 0, deadline: 1 days});
            ERC20PermitStruct memory approvalUserC_ = ERC20PermitStruct({
                owner: userA,
                spender: address(this),
                value: bUsdoYieldBoxId,
                nonce: 1, // Nonce is 1 because we already called permit() on userB
                deadline: 2 days
            });

            permitApprovalB_ = __getYieldBoxPermitAssetData(
                approvalUserB_,
                address(yieldBox),
                true,
                _getYieldBoxPermitAssetTypedDataHash(approvalUserB_, true),
                userAPKey
            );

            permitApprovalC_ = __getYieldBoxPermitAssetData(
                approvalUserC_,
                address(yieldBox),
                true,
                _getYieldBoxPermitAssetTypedDataHash(approvalUserC_, true),
                userAPKey
            );

            YieldBoxApproveAssetMsg[] memory approvals_ = new YieldBoxApproveAssetMsg[](2);
            approvals_[0] = permitApprovalB_;
            approvals_[1] = permitApprovalC_;

            approvalsMsg_ = usdoHelper.buildYieldBoxApproveAssetMsg(approvals_);
        }

        PrepareLzCallReturn memory prepareLzCallReturn_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_YB_APPROVE_ASSET,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: 0,
                    data: approvalsMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn_.lzSendParam;

        assertEq(yieldBox.isApprovedForAsset(address(userA), address(userB), aUsdoYieldBoxId), false);
        assertEq(yieldBox.isApprovedForAsset(address(userA), address(this), bUsdoYieldBoxId), false);

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(uint32(bEid), address(bUsdo));

        __callLzCompose(
            LzOFTComposedData(
                PT_YB_APPROVE_ASSET,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                address(bUsdo), // Compose creator (at lzReceive)
                address(bUsdo), // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );

        assertEq(yieldBox.isApprovedForAsset(address(userA), address(userB), aUsdoYieldBoxId), true);
        assertEq(yieldBox.isApprovedForAsset(address(userA), address(this), bUsdoYieldBoxId), true);
    }

    function test_usdo_yb_revoke_asset() public {
        YieldBoxApproveAssetMsg memory permitApprovalB_;
        YieldBoxApproveAssetMsg memory permitApprovalC_;
        bytes memory approvalsMsg_;

        {
            ERC20PermitStruct memory approvalUserB_ =
                ERC20PermitStruct({owner: userA, spender: userB, value: aUsdoYieldBoxId, nonce: 0, deadline: 1 days});
            ERC20PermitStruct memory approvalUserC_ = ERC20PermitStruct({
                owner: userA,
                spender: address(this),
                value: bUsdoYieldBoxId,
                nonce: 1, // Nonce is 1 because we already called permit() on userB
                deadline: 2 days
            });

            permitApprovalB_ = __getYieldBoxPermitAssetData(
                approvalUserB_,
                address(yieldBox),
                false,
                _getYieldBoxPermitAssetTypedDataHash(approvalUserB_, false),
                userAPKey
            );

            permitApprovalC_ = __getYieldBoxPermitAssetData(
                approvalUserC_,
                address(yieldBox),
                false,
                _getYieldBoxPermitAssetTypedDataHash(approvalUserC_, false),
                userAPKey
            );

            YieldBoxApproveAssetMsg[] memory approvals_ = new YieldBoxApproveAssetMsg[](2);
            approvals_[0] = permitApprovalB_;
            approvals_[1] = permitApprovalC_;

            approvalsMsg_ = usdoHelper.buildYieldBoxApproveAssetMsg(approvals_);
        }

        PrepareLzCallReturn memory prepareLzCallReturn_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_YB_APPROVE_ASSET,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: 0,
                    data: approvalsMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn_.lzSendParam;

        vm.prank(address(userA));
        yieldBox.setApprovalForAsset(address(userB), aUsdoYieldBoxId, true);
        vm.prank(address(userA));
        yieldBox.setApprovalForAsset(address(this), bUsdoYieldBoxId, true);
        assertEq(yieldBox.isApprovedForAsset(address(userA), address(userB), aUsdoYieldBoxId), true);
        assertEq(yieldBox.isApprovedForAsset(address(userA), address(this), bUsdoYieldBoxId), true);

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(uint32(bEid), address(bUsdo));

        __callLzCompose(
            LzOFTComposedData(
                PT_YB_APPROVE_ASSET,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                address(bUsdo), // Compose creator (at lzReceive)
                address(bUsdo), // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );

        assertEq(yieldBox.isApprovedForAsset(address(userA), address(userB), aUsdoYieldBoxId), false);
        assertEq(yieldBox.isApprovedForAsset(address(userA), address(this), bUsdoYieldBoxId), false);
    }

    function test_usdo_market_permit_asset() public {
        bytes memory approvalMsg_;
        {
            // @dev v,r,s will be completed on `__getMarketPermitData`
            MarketPermitActionMsg memory approvalUserB_ = MarketPermitActionMsg({
                target: address(singularity),
                owner: userA,
                spender: userB,
                value: 1e18,
                deadline: 1 days,
                v: 0,
                r: 0,
                s: 0,
                permitAsset: true
            });

            bytes32 digest_ = _getMarketPermitTypedDataHash(true, userA, userB, 1e18, 1 days);
            MarketPermitActionMsg memory permitApproval_ = __getMarketPermitData(approvalUserB_, digest_, userAPKey);

            approvalMsg_ = usdoHelper.buildMarketPermitApprovalMsg(permitApproval_);
        }

        cluster.updateContract(0, address(bUsdo), true);

        PrepareLzCallReturn memory prepareLzCallReturn_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_MARKET_PERMIT,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: 0,
                    data: approvalMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn_.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(uint32(bEid), address(bUsdo));

        __callLzCompose(
            LzOFTComposedData(
                PT_MARKET_PERMIT,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                address(bUsdo), // Compose creator (at lzReceive)
                address(bUsdo), // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );

        assertEq(singularity.allowance(userA, userB), 1e18);
    }

    function test_usdo_market_permit_collateral() public {
        bytes memory approvalMsg_;
        {
            // @dev v,r,s will be completed on `__getMarketPermitData`
            MarketPermitActionMsg memory approvalUserB_ = MarketPermitActionMsg({
                target: address(singularity),
                owner: userA,
                spender: userB,
                value: 1e18,
                deadline: 1 days,
                v: 0,
                r: 0,
                s: 0,
                permitAsset: false
            });

            bytes32 digest_ = _getMarketPermitTypedDataHash(false, userA, userB, 1e18, 1 days);
            MarketPermitActionMsg memory permitApproval_ = __getMarketPermitData(approvalUserB_, digest_, userAPKey);

            approvalMsg_ = usdoHelper.buildMarketPermitApprovalMsg(permitApproval_);
        }

        cluster.updateContract(0, address(bUsdo), true);

        PrepareLzCallReturn memory prepareLzCallReturn_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_MARKET_PERMIT,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 1_000_000,
                    value: 0,
                    data: approvalMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 1_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn_.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        verifyPackets(uint32(bEid), address(bUsdo));

        __callLzCompose(
            LzOFTComposedData(
                PT_MARKET_PERMIT,
                msgReceipt_.guid,
                sentMsg,
                bEid,
                address(bUsdo), // Compose creator (at lzReceive)
                address(bUsdo), // Compose receiver (at lzCompose)
                address(this),
                oftMsgOptions_
            )
        );

        assertEq(singularity.allowanceBorrow(userA, userB), 1e18);
    }

    function test_usdo_lend() public {
        uint256 erc20Amount_ = 1 ether;
        uint256 tokenAmount_ = 0.5 ether;

        deal(address(bUsdo), address(this), erc20Amount_);
        pearlmit.approve(20, address(bUsdo), 0, address(magnetar), uint200(tokenAmount_), uint48(block.timestamp)); // Atomic approval
        bUsdo.approve(address(pearlmit), tokenAmount_);

        LZSendParam memory withdrawLzSendParam_;
        MessagingFee memory withdrawMsgFee_; // Will be used as value for the composed msg

        {
            // @dev `withdrawMsgFee_` is to be airdropped on dst to pay for the send to source operation (B->A).
            PrepareLzCallReturn memory prepareLzCallReturn1_ = usdoHelper.prepareLzCall( // B->A data
                IUsdo(address(bUsdo)),
                PrepareLzCallData({
                    dstEid: aEid,
                    recipient: OFTMsgCodec.addressToBytes32(address(this)),
                    amountToSendLD: 0,
                    minAmountToCreditLD: 0,
                    msgType: SEND,
                    composeMsgData: ComposeMsgData({
                        index: 0,
                        gas: 0,
                        value: 0,
                        data: bytes(""),
                        prevData: bytes(""),
                        prevOptionsData: bytes("")
                    }),
                    lzReceiveGas: 5_000_000,
                    lzReceiveValue: 0,
                    refundAddress: address(this)
                })
            );
            withdrawLzSendParam_ = prepareLzCallReturn1_.lzSendParam;
            withdrawMsgFee_ = prepareLzCallReturn1_.msgFee;
        }

        /**
         * Actions
         */
        singularity.approve(address(magnetar), type(uint256).max);

        uint256 sh = yieldBox.toShare(bUsdoYieldBoxId, tokenAmount_, false);
        pearlmit.approve(
            1155, address(yieldBox), bUsdoYieldBoxId, address(singularity), uint200(sh), uint48(block.timestamp)
        ); // Atomic approval
        yieldBox.setApprovalForAll(address(pearlmit), true);

        uint256 tokenAmountSD = usdoHelper.toSD(tokenAmount_, aUsdo.decimalConversionRate());
        MarketLendOrRepayMsg memory marketMsg = MarketLendOrRepayMsg({
            user: address(this),
            lendParams: ILendOrRepayParams({
                repay: false,
                depositAmount: tokenAmountSD,
                repayAmount: 0,
                magnetar: address(magnetar),
                marketHelper: address(marketHelper),
                market: address(singularity),
                removeCollateral: false,
                removeCollateralAmount: 0,
                lockData: IOptionsLockData({lock: false, target: address(0), lockDuration: 0, amount: 0, fraction: 0}),
                participateData: IOptionsParticipateData({participate: false, target: address(0), tOLPTokenId: 0})
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

        bytes memory marketMsg_ = usdoHelper.buildMarketLendOrRepayMsg(marketMsg);

        PrepareLzCallReturn memory prepareLzCallReturn2_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_YB_SEND_SGL_LEND_OR_REPAY,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 5_000_000,
                    value: uint128(withdrawMsgFee_.nativeFee),
                    data: marketMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 5_000_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory oftMsgOptions_ = prepareLzCallReturn2_.oftMsgOptions;
        MessagingReceipt memory msgReceipt_;
        bytes memory sentMsg;

        {
            bytes memory composeMsg_ = prepareLzCallReturn2_.composeMsg;
            MessagingFee memory msgFee_ = prepareLzCallReturn2_.msgFee;
            LZSendParam memory lzSendParam_ = prepareLzCallReturn2_.lzSendParam;
            (msgReceipt_,, sentMsg,) = aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);
        }

        {
            verifyPackets(uint32(bEid), address(bUsdo));

            __callLzCompose(
                LzOFTComposedData(
                    PT_YB_SEND_SGL_LEND_OR_REPAY,
                    msgReceipt_.guid,
                    sentMsg,
                    bEid,
                    address(bUsdo), // Compose creator (at lzReceive)
                    address(bUsdo), // Compose receiver (at lzCompose)
                    address(this),
                    oftMsgOptions_
                )
            );
        }

        // Check execution
        {
            assertLt(bUsdo.balanceOf(address(this)), erc20Amount_);
        }
    }

    function test_usdo_repay_and_remove_collateral() public {
        singularity.approve(address(magnetar), type(uint256).max);

        uint256 erc20Amount_ = 1 ether;
        uint256 tokenAmount_ = 0.5 ether;

        uint256 sh = yieldBox.toShare(bUsdoYieldBoxId, erc20Amount_, false);
        uint256 collateralId = singularity._collateralId();
        // setup
        {
            aUsdo.approve(address(singularity), type(uint256).max);
            aUsdo.approve(address(yieldBox), type(uint256).max);
            bUsdo.approve(address(singularity), type(uint256).max);
            bUsdo.approve(address(yieldBox), type(uint256).max);

            deal(address(bUsdo), address(this), erc20Amount_);
            yieldBox.depositAsset(bUsdoYieldBoxId, address(this), address(this), erc20Amount_, 0);

            yieldBox.setApprovalForAll(address(pearlmit), true);
            pearlmit.approve(
                1155, address(yieldBox), bUsdoYieldBoxId, address(singularity), uint200(sh), uint48(block.timestamp)
            ); // Atomic approval
            singularity.addAsset(address(this), address(this), false, sh);

            deal(address(aUsdo), address(this), erc20Amount_);
            yieldBox.depositAsset(aUsdoYieldBoxId, address(this), address(this), erc20Amount_, 0);

            pearlmit.approve(
                1155, address(yieldBox), collateralId, address(singularity), uint200(sh), uint48(block.timestamp)
            ); // Atomic approval

            uint256 collateralShare = yieldBox.toShare(aUsdoYieldBoxId, erc20Amount_, false);
            Module[] memory modules;
            bytes[] memory calls;
            (modules, calls) = marketHelper.addCollateral(address(this), address(this), false, 0, collateralShare);
            singularity.execute(modules, calls, true);

            assertEq(singularity._userBorrowPart(address(this)), 0);
            (modules, calls) = marketHelper.borrow(address(this), address(this), tokenAmount_);
            singularity.execute(modules, calls, true);
            assertGt(singularity._userBorrowPart(address(this)), 0);

            // deal more to cover repay fees
            deal(address(bUsdo), address(this), erc20Amount_);
            yieldBox.depositAsset(bUsdoYieldBoxId, address(this), address(this), erc20Amount_, 0);
        }

        LZSendParam memory withdrawLzSendParam_;
        MessagingFee memory withdrawMsgFee_; // Will be used as value for the composed msg

        {
            // @dev `withdrawMsgFee_` is to be airdropped on dst to pay for the send to source operation (B->A).
            PrepareLzCallReturn memory prepareLzCallReturn1_ = usdoHelper.prepareLzCall( // B->A data
                IUsdo(address(bUsdo)),
                PrepareLzCallData({
                    dstEid: aEid,
                    recipient: OFTMsgCodec.addressToBytes32(address(this)),
                    amountToSendLD: 0,
                    minAmountToCreditLD: 0,
                    msgType: SEND,
                    composeMsgData: ComposeMsgData({
                        index: 0,
                        gas: 0,
                        value: 0,
                        data: bytes(""),
                        prevData: bytes(""),
                        prevOptionsData: bytes("")
                    }),
                    lzReceiveGas: 500_000,
                    lzReceiveValue: 0,
                    refundAddress: address(this)
                })
            );
            withdrawLzSendParam_ = prepareLzCallReturn1_.lzSendParam;
            withdrawMsgFee_ = prepareLzCallReturn1_.msgFee;
        }

        /**
         * Actions
         */
        singularity.approveBorrow(address(magnetar), type(uint256).max);

        pearlmit.approve(
            1155, address(yieldBox), bUsdoYieldBoxId, address(singularity), uint200(sh), uint48(block.timestamp)
        ); // Atomic approval
        yieldBox.setApprovalForAll(address(pearlmit), true);

        uint256 userCollateralShareBefore = singularity._userCollateralShare(address(this));
        uint256 tokenAmountSD = usdoHelper.toSD(tokenAmount_, aUsdo.decimalConversionRate());

        MarketLendOrRepayMsg memory marketMsg = MarketLendOrRepayMsg({
            user: address(this),
            lendParams: ILendOrRepayParams({
                repay: true,
                depositAmount: 0,
                repayAmount: tokenAmount_,
                magnetar: address(magnetar),
                marketHelper: address(marketHelper),
                market: address(singularity),
                removeCollateral: true,
                removeCollateralAmount: tokenAmountSD,
                lockData: IOptionsLockData({lock: false, target: address(0), lockDuration: 0, amount: 0, fraction: 0}),
                participateData: IOptionsParticipateData({participate: false, target: address(0), tOLPTokenId: 0})
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

        bytes memory marketMsg_ = usdoHelper.buildMarketLendOrRepayMsg(marketMsg);

        PrepareLzCallReturn memory prepareLzCallReturn2_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_YB_SEND_SGL_LEND_OR_REPAY,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 500_000,
                    value: uint128(withdrawMsgFee_.nativeFee),
                    data: marketMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 500_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn2_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn2_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn2_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn2_.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        {
            verifyPackets(uint32(bEid), address(bUsdo));

            __callLzCompose(
                LzOFTComposedData(
                    PT_YB_SEND_SGL_LEND_OR_REPAY,
                    msgReceipt_.guid,
                    sentMsg,
                    bEid,
                    address(bUsdo), // Compose creator (at lzReceive)
                    address(bUsdo), // Compose receiver (at lzCompose)
                    address(this),
                    oftMsgOptions_
                )
            );
        }

        // Check execution
        {
            assertEq(singularity._userBorrowPart(address(this)), 0);
            assertGt(userCollateralShareBefore, singularity._userCollateralShare(address(this)));
        }
    }

    function test_market_remove_asset() public {
        uint256 erc20Amount_ = 1 ether;

        // setup
        {
            deal(address(bUsdo), address(this), erc20Amount_);
            bUsdo.approve(address(yieldBox), type(uint256).max);
            yieldBox.depositAsset(bUsdoYieldBoxId, address(this), address(this), erc20Amount_, 0);

            uint256 sh = yieldBox.toShare(bUsdoYieldBoxId, erc20Amount_, false);
            yieldBox.setApprovalForAll(address(pearlmit), true);
            pearlmit.approve(
                1155, address(yieldBox), bUsdoYieldBoxId, address(singularity), uint200(sh), uint48(block.timestamp)
            );
            singularity.addAsset(address(this), address(this), false, sh);
        }

        //useful in case of withdraw after borrow
        LZSendParam memory withdrawLzSendParam_;
        MessagingFee memory withdrawMsgFee_; // Will be used as value for the composed msg

        uint256 tokenAmount_ = 0.5 ether;

        {
            // @dev `withdrawMsgFee_` is to be airdropped on dst to pay for the send to source operation (B->A).
            PrepareLzCallReturn memory prepareLzCallReturn1_ = usdoHelper.prepareLzCall( // B->A data
                IUsdo(address(bUsdo)),
                PrepareLzCallData({
                    dstEid: aEid,
                    recipient: OFTMsgCodec.addressToBytes32(address(this)),
                    amountToSendLD: 0,
                    minAmountToCreditLD: 0,
                    msgType: SEND,
                    composeMsgData: ComposeMsgData({
                        index: 0,
                        gas: 0,
                        value: 0,
                        data: bytes(""),
                        prevData: bytes(""),
                        prevOptionsData: bytes("")
                    }),
                    lzReceiveGas: 500_000,
                    lzReceiveValue: 0,
                    refundAddress: address(this)
                })
            );
            withdrawLzSendParam_ = prepareLzCallReturn1_.lzSendParam;
            withdrawMsgFee_ = prepareLzCallReturn1_.msgFee;
        }

        /**
         * Actions
         */
        uint256 tokenAmountSD = usdoHelper.toSD(tokenAmount_, aUsdo.decimalConversionRate());

        //approve magnetar
        bUsdo.approve(address(magnetar), type(uint256).max);
        singularity.approve(address(magnetar), type(uint256).max);
        MarketRemoveAssetMsg memory marketMsg = MarketRemoveAssetMsg({
            user: address(this),
            externalData: ICommonExternalContracts({
                magnetar: address(magnetar),
                singularity: address(singularity),
                bigBang: address(0),
                marketHelper: address(marketHelper)
            }),
            removeAndRepayData: IRemoveAndRepay({
                removeAssetFromSGL: true,
                removeAmount: tokenAmountSD,
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
        bytes memory marketMsg_ = usdoHelper.buildMarketRemoveAssetMsg(marketMsg);

        PrepareLzCallReturn memory prepareLzCallReturn2_ = usdoHelper.prepareLzCall(
            IUsdo(address(aUsdo)),
            PrepareLzCallData({
                dstEid: bEid,
                recipient: OFTMsgCodec.addressToBytes32(address(this)),
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: PT_MARKET_REMOVE_ASSET,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 500_000,
                    value: uint128(withdrawMsgFee_.nativeFee),
                    data: marketMsg_,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: 500_000,
                lzReceiveValue: 0,
                refundAddress: address(this)
            })
        );
        bytes memory composeMsg_ = prepareLzCallReturn2_.composeMsg;
        bytes memory oftMsgOptions_ = prepareLzCallReturn2_.oftMsgOptions;
        MessagingFee memory msgFee_ = prepareLzCallReturn2_.msgFee;
        LZSendParam memory lzSendParam_ = prepareLzCallReturn2_.lzSendParam;

        (MessagingReceipt memory msgReceipt_,, bytes memory sentMsg,) =
            aUsdo.sendPacket{value: msgFee_.nativeFee}(lzSendParam_, composeMsg_);

        {
            verifyPackets(uint32(bEid), address(bUsdo));

            __callLzCompose(
                LzOFTComposedData(
                    PT_MARKET_REMOVE_ASSET,
                    msgReceipt_.guid,
                    sentMsg,
                    bEid,
                    address(bUsdo), // Compose creator (at lzReceive)
                    address(bUsdo), // Compose receiver (at lzCompose)
                    address(this),
                    oftMsgOptions_
                )
            );
        }

        // Check execution
        {
            assertEq(bUsdo.balanceOf(address(this)), 0);
            assertEq(
                yieldBox.toAmount(bUsdoYieldBoxId, yieldBox.balanceOf(address(this), bUsdoYieldBoxId), false),
                tokenAmount_
            );
        }
    }

    function test_poc39() public {
        address alice = address(1337);
        address bob = address(1338);
        address charlie = address(1339);

        uint256 erc20Amount_ = 10e18;
        //Setup victim account
        {
            vm.startPrank(alice);
            deal(address(bUsdo), alice, erc20Amount_);
            bUsdo.approve(address(yieldBox), type(uint256).max);
            (, uint256 shares) = yieldBox.depositAsset(bUsdoYieldBoxId, alice, alice, erc20Amount_, 0);

            yieldBox.setApprovalForAll(address(pearlmit), true);
            pearlmit.approve(
                1155, address(yieldBox), bUsdoYieldBoxId, address(singularity), uint200(shares), uint48(block.timestamp)
            );
            singularity.addAsset(alice, alice, false, shares);

            vm.stopPrank();
        }

        //Setup conditions (have borrows to trigger yieldbox.toShare conversion)
        {
            uint256 collateralAmount = erc20Amount_ * 2;
            vm.startPrank(charlie);
            deal(address(aUsdo), charlie, collateralAmount);
            aUsdo.approve(address(yieldBox), type(uint256).max);
            (, uint256 shares) = yieldBox.depositAsset(aUsdoYieldBoxId, charlie, charlie, collateralAmount, 0);

            yieldBox.setApprovalForAll(address(pearlmit), true);
            pearlmit.approve(
                1155, address(yieldBox), aUsdoYieldBoxId, address(singularity), uint200(shares), uint48(block.timestamp)
            );

            Module[] memory modules;
            bytes[] memory calls;
            (modules, calls) = marketHelper.addCollateral(charlie, charlie, false, 0, shares);
            singularity.execute(modules, calls, true);

            (modules, calls) = marketHelper.borrow(charlie, charlie, (erc20Amount_ * 9) / 10);
            singularity.execute(modules, calls, true);

            vm.stopPrank();
        }

        //Simulate some yield has accrued in the strategy by donating some amount directly to strategy
        uint256 YIELD_AMOUNT = 10 * erc20Amount_;
        deal(address(bUsdo), address(this), YIELD_AMOUNT);
        bUsdo.transfer(address(bUsdoStrategy), YIELD_AMOUNT);

        //Bob can extract some asset from Alice without approval
        {
            uint256 EXTRACT_AMOUNT = 5;
            vm.startPrank(bob);
            vm.expectRevert();
            singularity.removeAsset(alice, bob, EXTRACT_AMOUNT);
        }
    }

    function _getMarketPermitTypedDataHash(
        bool permitAsset,
        address owner_,
        address spender_,
        uint256 value_,
        uint256 deadline_
    ) private view returns (bytes32) {
        bytes32 permitTypeHash_ = permitAsset
            ? bytes32(0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9)
            : bytes32(0xe9685ff6d48c617fe4f692c50e602cce27cbad0290beb93cfa77eac43968d58c);

        uint256 nonce = singularity.nonces(owner_);
        bytes32 structHash_ = keccak256(abi.encode(permitTypeHash_, owner_, spender_, value_, nonce++, deadline_));

        return keccak256(abi.encodePacked("\x19\x01", singularity.DOMAIN_SEPARATOR(), structHash_));
    }

    function _getYieldBoxPermitAllTypedDataHash(ERC20PermitStruct memory _permitData, bool permit)
        private
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

    function _getYieldBoxPermitAssetTypedDataHash(ERC20PermitStruct memory _permitData, bool permit)
        private
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
