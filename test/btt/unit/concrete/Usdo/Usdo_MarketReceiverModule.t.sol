// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {UsdoMarketReceiverModule} from "contracts/usdo/modules/UsdoMarketReceiverModule.sol";
import {MarketLendOrRepayMsg, MarketRemoveAssetMsg} from "tap-utils/interfaces/oft/IUsdo.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// tests
import {Usdo_Unit_Shared} from "../../shared/Usdo_Unit_Shared.t.sol";
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

// mocks
import {MagnetarDecoder_test} from "../../../mocks/MagnetarDecoder_test.sol";

contract Usdo_MarketReceiverModule is Usdo_Unit_Shared, BigBang_Unit_Shared {
    address _magnetar;
    address _marketHelper; 
    address _market;
    address _lockDataTarget;
    address _participateDataTarget;

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public override(Usdo_Unit_Shared, BigBang_Unit_Shared) {
        super.setUp();

        _magnetar = address(new MagnetarDecoder_test()); 
        _marketHelper = address (new MarketHelper());
        _market = address(mainBB);
        _lockDataTarget = makeAddr("_lockDataTarget");
        _participateDataTarget = makeAddr("_participateDataTarget");

        cluster.updateContract(0, _magnetar, true);
        cluster.updateContract(0, _marketHelper, true);
        cluster.updateContract(0, _market, true);
        cluster.updateContract(0, _lockDataTarget, true);
        cluster.updateContract(0, _participateDataTarget, true);
    }

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //
    modifier whenAmountsAreValid(uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount) {
        vm.assume(_depositAmount > VALUE_ZERO && _depositAmount < LARGE_AMOUNT);
        vm.assume(_repayAmount > VALUE_ZERO && _repayAmount < _depositAmount);
        vm.assume(_removeCollateralAmount > VALUE_ZERO && _repayAmount < _removeCollateralAmount);
        _;
    }

    // *************** //
    // *** HELPERS *** //
    // *************** //
    function _expectLendOrRepayToRevertFor(address _for, uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount) 
        private 
        whenAmountsAreValid(_repayAmount, _depositAmount, _removeCollateralAmount)
    {
        cluster.updateContract(0, _for, false);

        _LendOrRepayInternal memory _lendOrRepayInternal = _LendOrRepayInternal({
            repay: true,
            lock: true,
            participate: true,
            removeCollateral: true,
            repayAmount: _repayAmount,
            depositAmount: _depositAmount,
            magnetar: _magnetar,
            marketHelper: _marketHelper,
            market: _market,
            removeCollateralAmount: _removeCollateralAmount,
            lockDataTarget: _lockDataTarget,
            participateDataTarget: _participateDataTarget
        });
        MarketLendOrRepayMsg memory _msg = _createMinimalLendOrRepayMsg(_lendOrRepayInternal);

        // it should revert
        vm.expectRevert(abi.encodeWithSelector(
            UsdoMarketReceiverModule.UsdoMarketReceiverModule_NotAuthorized.selector,
            _for
        ));
        usdoMarketReceiverModule.lendOrRepayReceiver(address(this), abi.encode(_msg));
    }

    function _expectLendOrRepayToForwardTheCall(bool _repay, bool _removeCollateral, uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount) 
        private
    {
        _LendOrRepayInternal memory _lendOrRepayInternal = _LendOrRepayInternal({
            repay: _repay,
            lock: false,
            participate: false,
            removeCollateral: _removeCollateral,
            repayAmount: _repayAmount,
            depositAmount: _depositAmount,
            magnetar: _magnetar,
            marketHelper: _marketHelper,
            market: _market,
            removeCollateralAmount: _removeCollateralAmount,
            lockDataTarget: _lockDataTarget,
            participateDataTarget: _participateDataTarget
        });
        MarketLendOrRepayMsg memory _msg = _createMinimalLendOrRepayMsg(_lendOrRepayInternal);
        usdoMarketReceiverModule.lendOrRepayReceiver(address(this), abi.encode(_msg));
    }

    function _expectRemoveAssetToRevertFor(address _for, uint256 _removeAmount) private 
    {
        vm.assume(_removeAmount > SMALL_AMOUNT && _removeAmount < LARGE_AMOUNT);
        cluster.updateContract(0, _for, false);
        _RemoveAssetInternal memory _removeAssetData = _RemoveAssetInternal({
            magnetar: _magnetar,
            marketHelper: _marketHelper,
            market: _market,
            removeAmount: _removeAmount,
            repayAmount: 0,
            removeCollateralAmount: 0,
            bb: address(0)
        });

        MarketRemoveAssetMsg memory _msg = _createMinimalRemoveAssetMsg(_removeAssetData);
        // it should revert
        vm.expectRevert(abi.encodeWithSelector(
            UsdoMarketReceiverModule.UsdoMarketReceiverModule_NotAuthorized.selector,
            _for
        ));
        usdoMarketReceiverModule.removeAssetReceiver(address(this), abi.encode(_msg));
    }

    function _expectRemoveAssetToForwardTheCall(uint256 _removeAmount) private {
        _RemoveAssetInternal memory _removeAssetData = _RemoveAssetInternal({
            magnetar: _magnetar,
            marketHelper: _marketHelper,
            market: _market,
            removeAmount: _removeAmount,
            repayAmount: 0,
            removeCollateralAmount: 0,
            bb: address(0)
        });
        MarketRemoveAssetMsg memory _msg = _createMinimalRemoveAssetMsg(_removeAssetData);
        usdoMarketReceiverModule.removeAssetReceiver(address(this), abi.encode(_msg));
    }
    
    function test_whenLendOrRepayReceiverIsCalled_RevertGiven_MagnetarNotWhitelisted(uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount)
        external
    {
        _expectLendOrRepayToRevertFor(_magnetar, _repayAmount, _depositAmount, _removeCollateralAmount);
    }

    function test_whenLendOrRepayReceiverIsCalled_RevertGiven_MarketHelperNotWhitelisted(uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount)
        external
    {
        _expectLendOrRepayToRevertFor(_marketHelper, _repayAmount, _depositAmount, _removeCollateralAmount);
    }

    function test_whenLendOrRepayReceiverIsCalled_RevertGiven_MarketIsNotWhitelisted(uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount)
        external
    {
        _expectLendOrRepayToRevertFor(_market, _repayAmount, _depositAmount, _removeCollateralAmount);
    }

    function test_whenLendOrRepayReceiverIsCalled_RevertGiven_LockDataTargetIsNotWhitelisted(uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount)
        external
    {
        _expectLendOrRepayToRevertFor(_lockDataTarget, _repayAmount, _depositAmount, _removeCollateralAmount);
    }

    function test_whenLendOrRepayReceiverIsCalled_RevertGiven_ParticipateDataTargetIsNotWhitelisted(uint256 _repayAmount, uint256 _depositAmount, uint256 _removeCollateralAmount)
        external
    {
        _expectLendOrRepayToRevertFor(_participateDataTarget, _repayAmount, _depositAmount, _removeCollateralAmount);
    }

    function test_whenLendOrRepayReceiverIsCalled_WhenRepaying_GivenRepayAmountIs0(uint256 _depositAmount)
        external
    {
        vm.assume(_depositAmount > SMALL_AMOUNT && _depositAmount < LARGE_AMOUNT);

        // it should use depositAmount
        _expectLendOrRepayToForwardTheCall(true, false, VALUE_ZERO, _depositAmount, VALUE_ZERO);
        
        uint256 _depositAmountSD = usdoHelper.toSD(_depositAmount, usdo.decimalConversionRate());
        uint256 _depositAmountLD = usdoHelper.toLD(uint64(_depositAmountSD), usdo.decimalConversionRate());

        assertEq(MagnetarDecoder_test(_magnetar).repayAmount(), _depositAmountLD);
        assertEq(MagnetarDecoder_test(_magnetar).depositAmount(), _depositAmountLD);
    }

    function test_whenLendOrRepayReceiverIsCalled_WhenRepaying_GivenRemoveCollateralAmountIsGreaterThanZero(uint256 _depositAmount, uint256 _removeCollateralAmount)
        external
    {
        _depositAmount = bound(_depositAmount, SMALL_AMOUNT, LARGE_AMOUNT);
        _removeCollateralAmount = bound(_removeCollateralAmount, SMALL_AMOUNT, LARGE_AMOUNT);
        _expectLendOrRepayToForwardTheCall(true, true, VALUE_ZERO, _depositAmount, _removeCollateralAmount);

        uint256 _depositAmountSD = usdoHelper.toSD(_depositAmount, usdo.decimalConversionRate());
        uint256 _depositAmountLD = usdoHelper.toLD(uint64(_depositAmountSD), usdo.decimalConversionRate());

        uint256 _removeCollateralAmountSD = usdoHelper.toSD(_removeCollateralAmount, usdo.decimalConversionRate());
        uint256 _removeCollateralAmountLD = usdoHelper.toLD(uint64(_removeCollateralAmountSD), usdo.decimalConversionRate());

        assertEq(MagnetarDecoder_test(_magnetar).depositAmount(), _depositAmountLD);
        assertEq(MagnetarDecoder_test(_magnetar).removeAmount(), _removeCollateralAmountLD);
    }

    function test_whenLendOrRepayReceiverIsCalled_WhenLending(uint256 _depositAmount)
        external
    {
        _depositAmount = bound(_depositAmount, SMALL_AMOUNT, LARGE_AMOUNT);
        _expectLendOrRepayToForwardTheCall(false, false, VALUE_ZERO, _depositAmount, VALUE_ZERO);

        uint256 _depositAmountSD = usdoHelper.toSD(_depositAmount, usdo.decimalConversionRate());
        uint256 _depositAmountLD = usdoHelper.toLD(uint64(_depositAmountSD), usdo.decimalConversionRate());
        assertEq(MagnetarDecoder_test(_magnetar).depositAmount(), _depositAmountLD);
    }

    function test_whenRemoveAssetReceiverIsCalled_RevertGiven_MagnetarIsNotWhitelisted(uint256 _removeAmount)
        external
    {
        // it should revert
        _expectRemoveAssetToRevertFor(_magnetar, _removeAmount);
    }

    function test_whenRemoveAssetReceiverIsCalled_RevertGiven_MarketHelperIsNotWhitelisted(uint256 _removeAmount)
        external
    {
        // it should revert
        _expectRemoveAssetToRevertFor(_marketHelper, _removeAmount);
    }

    function test_whenRemoveAssetReceiverIsCalled_RevertGiven_BigBangIsNotWhitelisted(uint256 _removeAmount)
        external
    {
        // it should revert
        _expectRemoveAssetToRevertFor(_market, _removeAmount);
    }

    function test_whenRemoveAssetReceiverIsCalled_RevertGiven_SingularityIsNotWhitelisted(uint256 _removeAmount)
        external
    {
        // it should revert
        _expectRemoveAssetToRevertFor(_market, _removeAmount);
    }

    function test_WhenRemoveAssetReceiverIsCalledWithRightParameters(uint256 _removeAmount) external  {
        _removeAmount = bound(_removeAmount, SMALL_AMOUNT, LARGE_AMOUNT);
        _expectRemoveAssetToForwardTheCall(_removeAmount);

        uint256 _removeAmountSD = usdoHelper.toSD(_removeAmount, usdo.decimalConversionRate());
        uint256 _removeAmountLD = usdoHelper.toLD(uint64(_removeAmountSD), usdo.decimalConversionRate());
        assertEq(MagnetarDecoder_test(_magnetar).removeAmount(), _removeAmountLD);
    }
}
