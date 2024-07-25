// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// dependencies
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {BBDebtRateHelper} from "contracts/markets/bigBang/BBDebtRateHelper.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_setters is BigBang_Unit_Shared {
    function test_RevertWhen_SetLeverageExecutorIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        address rndAddr = makeAddr("rndAddress");

        vm.expectRevert();
        bb.setLeverageExecutor(ILeverageExecutor(rndAddr));
    }

    function test_WhenSetLeverageExecutorIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        address rndAddr = makeAddr("rndAddress");

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(Market.setLeverageExecutor.selector, ILeverageExecutor(rndAddr));
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(address(bb._leverageExecutor()), rndAddr);
    }

    function test_RevertWhen_SetLiquidationMaxSlippageIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.setLiquidationMaxSlippage(1000);
    }

    function test_WhenSetLiquidationMaxSlippageIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(Market.setLiquidationMaxSlippage.selector, 1000);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(bb._maxLiquidationSlippage(), 1000);
    }

    function test_RevertWhen_SetMarketConfigIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        address rndAddr = makeAddr("rndAddress");

        vm.expectRevert();
        bb.setMarketConfig(ITapiocaOracle(rndAddr), "0x", 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    function test_WhenSetMarketConfigIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        address rndAddr = makeAddr("rndAddress");

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(
            Market.setMarketConfig.selector,
            ITapiocaOracle(rndAddr),
            "0x",
            100, //protocol fee
            101, //_liquidationBonusAmount
            102, //_minLiquidatorReward
            103, //_maxLiquidatorReward
            104, //_totalBorrowCap
            105, //_collateralizationRate
            106, //_liquidationCollateralizationRate
            107, //_minBorrowAmount
            108 //_minCollateralAmount
        );
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(bb._protocolFee(), 100);
        assertEq(bb._liquidationBonusAmount(), 101);
        assertEq(bb._minLiquidatorReward(), 102);
        assertEq(bb._maxLiquidatorReward(), 103);
        assertEq(bb._totalBorrowCap(), 104);
        assertEq(bb._collateralizationRate(), 105);
        assertEq(bb._liquidationCollateralizationRate(), 106);
        assertEq(bb._minBorrowAmount(), 107);
        assertEq(bb._minCollateralAmount(), 108);
    }

    function test_RevertWhen_SetDebtRateHelperIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        address rndAddr = makeAddr("rndAddress");

        vm.expectRevert();
        bb.setDebtRateHelper(rndAddr);
    }

    function test_WhenSetDebtRateHelperIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        address rndAddr = makeAddr("rndAddress");

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, address(0));
        vm.expectRevert();
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);

        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, rndAddr);
        (success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(bb.debtRateHelper(), rndAddr);
    }

    function test_RevertWhen_ConsumeMintableOpenInterestDebtIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.consumeMintableOpenInterestDebt();
    }

    function test_WhenConsumeMintableOpenInterestDebtIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.consumeMintableOpenInterestDebt.selector);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(bb.openInterestDebt(), 0);
    }

    function test_RevertWhen_SetMinAndMaxMintRangeIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.setMinAndMaxMintRange(0, 1);
    }

    function test_WhenSetMinAndMaxMintRangeIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);

        // min > max
        data[0] = abi.encodeWithSelector(BigBang.setMinAndMaxMintRange.selector, 1, 100);
        vm.expectRevert();
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);

        data[0] = abi.encodeWithSelector(BigBang.setMinAndMaxMintRange.selector, 2, 1);
        (success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(bb.minMintFeeStart(), 2);
        assertEq(bb.maxMintFeeStart(), 1);
    }

    function test_RevertWhen_SetMinAndMaxMintFeeIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.setMinAndMaxMintFee(0, 1);
    }

    function test_WhenSetMinAndMaxMintFeeIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);

        data[0] = abi.encodeWithSelector(BigBang.setMinAndMaxMintFee.selector, 2, 1);
        vm.expectRevert();
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);

        data[0] = abi.encodeWithSelector(BigBang.setMinAndMaxMintFee.selector, 1, 2);
        (success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(bb.minMintFee(), 1);
        assertEq(bb.maxMintFee(), 2);
    }

    function test_RevertWhen_SetAssetOracleIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.setAssetOracle(address(0), "0x");
    }

    function test_WhenSetAssetOracleIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);

        address rndAddr = makeAddr("rndAddress");

        data[0] = abi.encodeWithSelector(BigBang.setAssetOracle.selector, rndAddr, "0x");
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(address(bb.assetOracle()), rndAddr);
    }

    function test_RevertWhen_RescueEthIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.rescueEth(1 ether, address(this));
    }

    function test_WhenRescueEthIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        vm.deal(address(bb), 1 ether);

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);

        address rndAddr = makeAddr("rndAddress");

        data[0] = abi.encodeWithSelector(BigBang.rescueEth.selector, 1 ether, rndAddr);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(rndAddr.balance, 1 ether);
    }

    function test_RevertWhen_RefreshPenroseFeesIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.refreshPenroseFees();
    }

    function test_WhenRefreshPenroseFeesIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        vm.deal(address(bb), 1 ether);

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.refreshPenroseFees.selector);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);
    }

    function test_RevertWhen_SetBigBangConfigIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.setBigBangConfig(0, 0, 0, 0);
    }

    function test_WhenSetBigBangConfigIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.setBigBangConfig.selector, 0, 0, 0, 100);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(bb._liquidationMultiplier(), 100);
    }

    function test_WhenSetBigBangConfigIsCalledFromOwnerForNonMainMarket() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));
        BBDebtRateHelper debtHelper = new BBDebtRateHelper();
        penrose.setBigBangEthMarket(address(bb));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);
        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, address(debtHelper));
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        BigBang secondaryBB = BigBang(payable(_registerSecondaryDefaultBigBang()));
        mc[0] = address(secondaryBB);
        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, address(debtHelper));
        (success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        mc[0] = address(secondaryBB);
        // slightly bigger than the default values
        data[0] = abi.encodeWithSelector(BigBang.setBigBangConfig.selector, 0.006 ether, 0.06 ether, 0.3 ether, 100);
        (success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertEq(secondaryBB._liquidationMultiplier(), 100);
        assertEq(secondaryBB.minDebtRate(), 0.006 ether);
        assertEq(secondaryBB.maxDebtRate(), 0.06 ether);
        assertEq(secondaryBB.debtRateAgainstEthMarket(), 0.3 ether);
    }

    function test_RevertWhen_UpdatePauseAllIsCalledFromNon_owner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.updatePauseAll(true);
    }

    function test_WhenUpdatePauseAllIsCalledFromPauser() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        assertFalse(bb._pauseOptions(Market.PauseType.AddCollateral));
        bb.updatePauseAll(true);
        assertTrue(bb._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_WhenUpdatePauseAllIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        assertFalse(bb._pauseOptions(Market.PauseType.AddCollateral));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);
        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.updatePauseAll.selector, true);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertTrue(bb._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_RevertWhen_UpdatePauseIsCalledFromNon_ownerAndNon_pauser() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        vm.expectRevert();
        bb.updatePause(Market.PauseType.Borrow, true);
    }

    function test_WhenUpdatePauseIsCalledFromPauser() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        assertFalse(bb._pauseOptions(Market.PauseType.AddCollateral));
        bb.updatePause(Market.PauseType.AddCollateral, true);
        assertTrue(bb._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_WhenUpdatePauseIsCalledFromOwner() external {
        BigBang bb = BigBang(payable(_registerDefaultBigBang()));

        assertFalse(bb._pauseOptions(Market.PauseType.AddCollateral));

        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);
        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(BigBang.updatePause.selector, Market.PauseType.AddCollateral, true);
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);

        assertTrue(bb._pauseOptions(Market.PauseType.AddCollateral));
    }
}
