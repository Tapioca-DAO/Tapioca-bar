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
import {UsdoOptionReceiverModule} from "contracts/usdo/modules/UsdoOptionReceiverModule.sol";
import {
    IExerciseOptionsData
} from "tap-utils/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {
    ExerciseOptionsMsg
} from "tap-utils/interfaces/oft/IUsdo.sol";
import {
    LZSendParam
} from "tap-utils/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {IPearlmit} from "tap-utils/pearlmit/Pearlmit.sol";

// tests
import {Usdo_Unit_Shared} from "../../shared/Usdo_Unit_Shared.t.sol";
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

// mocks
import {MagnetarDecoder_test} from "../../../mocks/MagnetarDecoder_test.sol";
import {TapiocaOptionsBrokerMock_test, OTapMock_test} from "../../../mocks/TapiocaOptionsBrokerMock_test.sol";


contract Usdo_OptionReceiverModule is Usdo_Unit_Shared, BigBang_Unit_Shared {
    address _magnetar;
    TapiocaOptionsBrokerMock_test tOB;

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public override(Usdo_Unit_Shared, BigBang_Unit_Shared) {
        super.setUp();

        _magnetar = address(new MagnetarDecoder_test()); 
        tOB = new TapiocaOptionsBrokerMock_test(address(tapToken), IPearlmit(address(pearlmit)));

        cluster.setRoleForContract(address(tOB),  keccak256("USDO_TAP_CALLEE"), true);

    }

    function _createMinimalExerciseOptionsMsg(uint256 amount) private view returns (ExerciseOptionsMsg memory) {
        ExerciseOptionsMsg memory _msg = ExerciseOptionsMsg({
            optionsData: IExerciseOptionsData({
                from: address(this),
                target: address(tOB),
                paymentTokenAmount: amount,
                oTAPTokenID: 0, // @dev ignored in TapiocaOptionsBrokerMock
                tapAmount: 0
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
        return _msg;
    }
    function test_whenExerciseOptionsReceiverIsCalled_RevertGiven_OptionsDataTargetIsNotWhitelisted()
        external
    {
        cluster.setRoleForContract(address(tOB),  keccak256("USDO_TAP_CALLEE"), false);

        ExerciseOptionsMsg memory _msg = _createMinimalExerciseOptionsMsg(0);

        // it should revert
        vm.expectRevert(abi.encodeWithSelector(
            UsdoOptionReceiverModule.UsdoOptionReceiverModule_NotAuthorized.selector,
            address(tOB),
            "USDO_TAP_CALLEE"
        ));
        usdoOptionsReceiverModule.exerciseOptionsReceiver(address(this), abi.encode(_msg));
    }

    function test_whenExerciseOptionsReceiverIsCalled_RevertGiven_ExerciseOptionCallerIsNotOTapOwner()
        external
    {
        address _owner = makeAddr("_owner");
        address oTapMock = tOB.oTapMock();
        OTapMock_test(oTapMock).setOwner(_owner);
        ExerciseOptionsMsg memory _msg = _createMinimalExerciseOptionsMsg(0);

        // it should revert
        vm.expectRevert(abi.encodeWithSelector(
            UsdoOptionReceiverModule.UsdoOptionReceiverModule_NotAuthorized.selector,
            address(this),
            ""
        ));
        usdoOptionsReceiverModule.exerciseOptionsReceiver(address(this), abi.encode(_msg));
    }

    function test_whenExerciseOptionsReceiverIsCalled_RevertGiven_OTapOwnerDidNotApproveTheModule()
        external
    {
        address oTapMock = tOB.oTapMock();
        OTapMock_test(oTapMock).setOwner(address(this));
        ExerciseOptionsMsg memory _msg = _createMinimalExerciseOptionsMsg(0);
        
        // it should revert
        vm.expectRevert(abi.encodeWithSelector(
            UsdoOptionReceiverModule.UsdoOptionReceiverModule_NotAuthorized.selector,
            address(this),
            ""
        ));
        usdoOptionsReceiverModule.exerciseOptionsReceiver(address(this), abi.encode(_msg));
    }

    function test_whenExerciseOptionsReceiverIsCalled_GivenCalledFromOwnerAndApprovedModule(uint256 amount)
        external
    {
        vm.assume(amount > SMALL_AMOUNT && amount < LARGE_AMOUNT);

        uint256 _amountSD = usdoHelper.toSD(amount, usdo.decimalConversionRate());
        {
            deal(address(usdoOptionsReceiverModule), address(this), amount);
            deal(address(tapToken), address(usdoOptionsReceiverModule), amount);
            tOB.setPaymentTokenAmount(amount);
        }

        address oTapMock = tOB.oTapMock();
        OTapMock_test(oTapMock).setOwner(address(this));
        ExerciseOptionsMsg memory _msg = _createMinimalExerciseOptionsMsg(_amountSD);

        pearlmit.approve(TOKEN_TYPE_ERC721, tOB.oTAP(), 0, address(usdoOptionsReceiverModule), type(uint200).max, uint48(block.timestamp));
        usdoOptionsReceiverModule.exerciseOptionsReceiver(address(this), abi.encode(_msg));
            
        assertEq(tapToken.balanceOf(address(this)), amount, "TapOFT");
    }

    function test_whenExerciseOptionsReceiverIsCalled_WhenAskedToWithdraw(uint256 amount)
        external
    {
        vm.assume(amount > SMALL_AMOUNT && amount < LARGE_AMOUNT);

        uint256 _amountSD = usdoHelper.toSD(amount, usdo.decimalConversionRate());
        {
            deal(address(usdoOptionsReceiverModule), address(this), amount);
            deal(address(tapToken), address(usdoOptionsReceiverModule), amount);
            tOB.setPaymentTokenAmount(amount/2);
        }

        address oTapMock = tOB.oTapMock();
        OTapMock_test(oTapMock).setOwner(address(this));
        ExerciseOptionsMsg memory _msg = _createMinimalExerciseOptionsMsg(_amountSD);

        pearlmit.approve(TOKEN_TYPE_ERC721, tOB.oTAP(), 0, address(usdoOptionsReceiverModule), type(uint200).max, uint48(block.timestamp));
        usdoOptionsReceiverModule.exerciseOptionsReceiver(address(this), abi.encode(_msg));
            
        assertEq(tapToken.balanceOf(address(this)), amount, "TapOFT");
    }
}
