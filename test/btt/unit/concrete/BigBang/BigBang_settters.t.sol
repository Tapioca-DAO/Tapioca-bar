// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";

// tests
import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

contract BigBang_setters is BigBang_Unit_Shared {

    function test_RevertWhen_SetLeverageExecutorIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setLeverageExecutor(ILeverageExecutor(rndAddr));
    }

    function test_WhenSetLeverageExecutorIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");

        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(
            address(mainBB), abi.encodeWithSelector(Market.setLeverageExecutor.selector, ILeverageExecutor(rndAddr))
        );
        assertEq(address(mainBB._leverageExecutor()), rndAddr);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(Market.setLeverageExecutor.selector, ILeverageExecutor(rndAddr))
        );
        assertEq(address(secondaryBB._leverageExecutor()), rndAddr);
    }

    function test_RevertWhen_SetLiquidationMaxSlippageIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setLiquidationMaxSlippage(MAX_MINT_FEE);
    }

    function test_WhenSetLiquidationMaxSlippageIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(Market.setLiquidationMaxSlippage.selector, MAX_MINT_FEE));
        assertEq(mainBB._maxLiquidationSlippage(), MAX_MINT_FEE);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(Market.setLiquidationMaxSlippage.selector, MAX_MINT_FEE)
        );
        assertEq(secondaryBB._maxLiquidationSlippage(), MAX_MINT_FEE);
    }

    function test_RevertWhen_SetMarketConfigIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setMarketConfig(ITapiocaOracle(rndAddr), "0x", 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    function test_WhenSetMarketConfigIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");

        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(
            address(mainBB),
            abi.encodeWithSelector(
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
            )
        );
        assertEq(mainBB._protocolFee(), 100);
        assertEq(mainBB._liquidationBonusAmount(), 101);
        assertEq(mainBB._minLiquidatorReward(), 102);
        assertEq(mainBB._maxLiquidatorReward(), 103);
        assertEq(mainBB._totalBorrowCap(), 104);
        assertEq(mainBB._collateralizationRate(), 105);
        assertEq(mainBB._liquidationCollateralizationRate(), 106);
        assertEq(mainBB._minBorrowAmount(), 107);
        assertEq(mainBB._minCollateralAmount(), 108);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB),
            abi.encodeWithSelector(
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
            )
        );
        assertEq(secondaryBB._protocolFee(), 100);
        assertEq(secondaryBB._liquidationBonusAmount(), 101);
        assertEq(secondaryBB._minLiquidatorReward(), 102);
        assertEq(secondaryBB._maxLiquidatorReward(), 103);
        assertEq(secondaryBB._totalBorrowCap(), 104);
        assertEq(secondaryBB._collateralizationRate(), 105);
        assertEq(secondaryBB._liquidationCollateralizationRate(), 106);
        assertEq(secondaryBB._minBorrowAmount(), 107);
        assertEq(secondaryBB._minCollateralAmount(), 108);
    }

    function test_RevertWhen_SetDebtRateHelperIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setDebtRateHelper(rndAddr);
    }

    function test_WhenSetDebtRateHelperIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");

        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, rndAddr));
        assertEq(mainBB.debtRateHelper(), rndAddr);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, rndAddr)
        );
        assertEq(secondaryBB.debtRateHelper(), rndAddr);
    }

    function test_RevertWhen_ConsumeMintableOpenInterestDebtIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.consumeMintableOpenInterestDebt();
    }

    function test_WhenConsumeMintableOpenInterestDebtIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.consumeMintableOpenInterestDebt.selector));
        assertEq(mainBB.openInterestDebt(), 0);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.consumeMintableOpenInterestDebt.selector)
        );
        assertEq(secondaryBB.openInterestDebt(), 0);
    }

    function test_RevertWhen_SetMinAndMaxMintRangeIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setMinAndMaxMintRange(LARGE_AMOUNT, SMALL_AMOUNT);
    }

    function test_WhenSetMinAndMaxMintRangeIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.setMinAndMaxMintRange.selector, LARGE_AMOUNT, SMALL_AMOUNT));
        assertEq(mainBB.minMintFeeStart(), LARGE_AMOUNT);
        assertEq(mainBB.maxMintFeeStart(), SMALL_AMOUNT);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.setMinAndMaxMintRange.selector, LARGE_AMOUNT, SMALL_AMOUNT)
        );
        assertEq(secondaryBB.minMintFeeStart(), LARGE_AMOUNT);
        assertEq(secondaryBB.maxMintFeeStart(), SMALL_AMOUNT);
    }

    function test_RevertWhen_SetMinAndMaxMintFeeIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setMinAndMaxMintFee(SMALL_AMOUNT, LARGE_AMOUNT);
    }

    function test_WhenSetMinAndMaxMintFeeIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.setMinAndMaxMintFee.selector, SMALL_AMOUNT, LARGE_AMOUNT));
        assertEq(mainBB.minMintFee(), SMALL_AMOUNT);
        assertEq(mainBB.maxMintFee(), LARGE_AMOUNT);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.setMinAndMaxMintFee.selector, SMALL_AMOUNT, LARGE_AMOUNT)
        );
        assertEq(secondaryBB.minMintFee(), SMALL_AMOUNT);
        assertEq(secondaryBB.maxMintFee(), LARGE_AMOUNT);
    }

    function test_RevertWhen_SetAssetOracleIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setAssetOracle(rndAddr, "");
    }

    function test_WhenSetAssetOracleIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");

        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.setAssetOracle.selector, rndAddr, ""));
        assertEq(address(mainBB.assetOracle()), rndAddr);

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.setAssetOracle.selector, rndAddr, "")
        );
        assertEq(address(secondaryBB.assetOracle()), rndAddr);
    }

    function test_RevertWhen_RescueEthIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.rescueEth(SMALL_AMOUNT, address(this));
    }

    function test_WhenRescueEthIsCalledFromOwner() external {
        address rndAddr = makeAddr("rndAddress");

        // **** Main BB market ****
        vm.deal(address(mainBB), SMALL_AMOUNT);
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.rescueEth.selector, SMALL_AMOUNT, rndAddr));
        assertEq(rndAddr.balance, SMALL_AMOUNT);

        // **** Secondary BB market ****
        vm.deal(address(secondaryBB), SMALL_AMOUNT);
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.rescueEth.selector, SMALL_AMOUNT, rndAddr)
        );
        assertEq(rndAddr.balance, SMALL_AMOUNT * 2);
    }

    function test_RevertWhen_RefreshPenroseFeesIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.refreshPenroseFees();
    }

    function test_WhenRefreshPenroseFeesIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.refreshPenroseFees.selector));

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.refreshPenroseFees.selector)
        );
    }

    function test_RevertWhen_SetBigBangConfigIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Ownable: caller is not the owner");
        mainBB.setBigBangConfig(VALUE_ZERO, VALUE_ZERO, VALUE_ZERO, VALUE_ZERO);
    }

    function test_WhenSetBigBangConfigIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.setBigBangConfig.selector, 0, 0, 0, FEE_PRECISION - 1));
        assertEq(mainBB._liquidationMultiplier(), FEE_PRECISION - 1);
    }

    function test_WhenSetBigBangConfigIsCalledFromOwnerForNonMainMarket() external {
        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.setBigBangConfig.selector, BB_MIN_DEBT_RATE + 1, BB_MAX_DEBT_RATE + 1, BB_DEBT_RATE_AGAINST_MAIN_MARKET + 1, FEE_PRECISION - 1)
        );
        assertEq(secondaryBB._liquidationMultiplier(), FEE_PRECISION - 1);
        assertEq(secondaryBB.minDebtRate(), BB_MIN_DEBT_RATE + 1);
        assertEq(secondaryBB.maxDebtRate(), BB_MAX_DEBT_RATE + 1);
        assertEq(secondaryBB.debtRateAgainstEthMarket(), BB_DEBT_RATE_AGAINST_MAIN_MARKET + 1);
    }

    function test_RevertWhen_UpdatePauseAllIsCalledFromNon_owner() external {
        // it should revert
        vm.expectRevert("Market: unauthorized");
        mainBB.updatePauseAll(true);
    }

    function test_WhenUpdatePauseAllIsCalledFromPauser() external {
        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        // **** Main BB market ****
        // it should not revert
        mainBB.updatePauseAll(true);
        assertTrue(mainBB._pauseOptions(Market.PauseType.AddCollateral));

        // **** Secondary BB market ****
        // it should not revert
        secondaryBB.updatePauseAll(true);
        assertTrue(secondaryBB._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_WhenUpdatePauseAllIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.updatePauseAll.selector, true));
        assertTrue(mainBB._pauseOptions(Market.PauseType.AddCollateral));

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.updatePauseAll.selector, true)
        );
        assertTrue(secondaryBB._pauseOptions(Market.PauseType.AddCollateral));
    }

    function test_RevertWhen_UpdatePauseIsCalledFromNon_ownerAndNon_pauser() external {
        // it should revert
        vm.expectRevert("Market: unauthorized");
        mainBB.updatePause(Market.PauseType.Borrow, true);
    }

    function test_WhenUpdatePauseIsCalledFromPauser() external {
        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        // **** Main BB market ****
        // it should not revert
        mainBB.updatePause(Market.PauseType.Borrow, true);
        assertTrue(mainBB._pauseOptions(Market.PauseType.Borrow));

        // **** Secondary BB market ****
        // it should not revert
        secondaryBB.updatePause(Market.PauseType.Borrow, true);
        assertTrue(secondaryBB._pauseOptions(Market.PauseType.Borrow));
    }

    function test_WhenUpdatePauseIsCalledFromOwner() external {
        // **** Main BB market ****
        // it should not revert
        _executeFromPenrose(address(mainBB), abi.encodeWithSelector(BigBang.updatePause.selector, Market.PauseType.Borrow, true));
        assertTrue(mainBB._pauseOptions(Market.PauseType.Borrow));

        // **** Secondary BB market ****
        // it should not revert
        _executeFromPenrose(
            address(secondaryBB), abi.encodeWithSelector(BigBang.updatePause.selector, Market.PauseType.Borrow, true)
        );
        assertTrue(secondaryBB._pauseOptions(Market.PauseType.Borrow));
    }
}
