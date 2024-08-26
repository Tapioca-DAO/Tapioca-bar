// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// mocks
import {ZeroXSwapperMockTarget_test} from "../../mocks/ZeroXSwapperMockTarget_test.sol";
import {LeverageExecutorMock_test} from "../../mocks/LeverageExecutorMock_test.sol";
import {OracleMock_test} from "../../mocks/OracleMock_test.sol";

// Tapioca
import {BBDebtRateHelper} from "contracts/markets/bigBang/BBDebtRateHelper.sol";
import {BBLiquidation} from "contracts/markets/bigBang/BBLiquidation.sol";
import {BBCollateral} from "contracts/markets/bigBang/BBCollateral.sol";
import {BBLeverage} from "contracts/markets/bigBang/BBLeverage.sol";
import {BBBorrow} from "contracts/markets/bigBang/BBBorrow.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {Module} from "tap-utils/interfaces/bar/IMarket.sol";

import {IMarketLiquidatorReceiver} from "tap-utils/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {IMarket} from "tap-utils/interfaces/bar/ISingularity.sol";
import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";
import {IPearlmit} from "tap-utils/pearlmit/Pearlmit.sol";

import {TOFTMock_test} from "../../mocks/TOFTMock_test.sol";

// tests
import {Markets_Unit_Shared} from "./Markets_Unit_Shared.t.sol";

abstract contract BigBang_Unit_Shared is Markets_Unit_Shared {
    using RebaseLibrary for Rebase;

    // ************ //
    // *** VARS *** //
    // ************ //
    OracleMock_test assetOracle; // BigBang assets oracle (USDC <> USDO equivalent)
    BBDebtRateHelper debtHelper; // BigBang Debt rate helper

    BigBang bbMc;
    BigBang mainBB;
    BigBang secondaryBB;

    LeverageExecutorMock_test leverageExecutor;

    error Test_Error_Invalid_Amount();

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public virtual override {
        super.setUp();

        // create default BigBang oracle
        assetOracle = _createOracle("Asset oracle");

        // create default BB master contract
        bbMc = new BigBang();
        penrose.registerBigBangMasterContract(address(bbMc), IPenrose.ContractType.lowRisk);

        // create BBDebtRateHelper
        debtHelper = new BBDebtRateHelper();

        // create leverage executor
        // mock to allow return value customization
        leverageExecutor = new LeverageExecutorMock_test();
        leverageExecutor.setOracle(ITapiocaOracle(address(oracle)));

        // create main BB market
        // it handles after deployment set-up
        mainBB = BigBang(payable(_registerBBMarket(address(mainToken), mainTokenId, true)));

        // create another BB market
        // it handles after deployment set-up
        secondaryBB = BigBang(payable(_registerBBMarket(address(randomCollateral), randomCollateralId, false)));
    }

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //
    modifier whenContractIsNotPaused() {
        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        mainBB.updatePauseAll(false);
        secondaryBB.updatePauseAll(false);
        _;
    }

    modifier whenContractIsPaused() {
        ICluster _cl = penrose.cluster();
        _cl.setRoleForContract(address(this), keccak256("PAUSABLE"), true);

        mainBB.updatePauseAll(true);
        secondaryBB.updatePauseAll(true);
        _;
    }

    modifier whenCollateralAmountIsValid(uint256 collateralAmount) {
        uint256 minCollateralAmount = mainBB._minCollateralAmount();
        vm.assume(collateralAmount > minCollateralAmount && collateralAmount < LARGE_AMOUNT);
        _;
    }

    modifier whenOracleRateIsEth() {
        oracle.set(5e14); // 2000$
        _;
    }

    modifier whenAssetOracleRateIsBelowMin() {
        assetOracle.set(1e18 - 1);
        _;
    }

    modifier whenAssetOracleRateIsAfterMin() {
        assetOracle.set(1e18 + 1);
        _;
    }

    modifier whenHasLeverageDownApproval(address txExecutor) {
        _resetPrank(txExecutor);

        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            txExecutor,
            address(mainBB),
            type(uint200).max,
            uint48(block.timestamp),
            mainBB._assetId()
        );
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            txExecutor,
            address(secondaryBB),
            type(uint200).max,
            uint48(block.timestamp),
            secondaryBB._assetId()
        );

        _;
    }

    modifier givenBorrowCapIsNotReachedYet() {
        // no cap
        assertEq(mainBB._totalBorrowCap(), 0);
        assertEq(secondaryBB._totalBorrowCap(), 0);
        _;
    }


    // **************** //
    // *** INTERNAL *** //
    // **************** //
    // // Takes `mainBB` CR rate into account
    function _boundBorrowAmount(uint256 borrowAmount, uint256 collateralAmount) internal view returns (uint256) {
        uint256 minBorrowAmount = mainBB._minBorrowAmount();
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));
        if (minBorrowAmount > maxBorrowAmount) revert Test_Error_Invalid_Amount();
        // assure a 10% threshold for insolvency
        maxBorrowAmount = maxBorrowAmount - (maxBorrowAmount * 1e4 / 1e5);
        borrowAmount = bound(borrowAmount, minBorrowAmount + 1, maxBorrowAmount - 1);
        return borrowAmount;
    }

    function _boundLeverageDownAmount(uint256 leverageAmount, BigBang bb) internal view returns (uint256) {
        uint256 collateralShare = bb._userCollateralShare(address(this));
        uint256 collateralAmount = yieldBox.toAmount(bb._collateralId(), collateralShare, false);
        leverageAmount = bound(leverageAmount, 1, collateralAmount);
        return leverageAmount;
    }

    function _boundLeverageUpAmount(uint256 leverageAmount, BigBang bb) internal view returns (uint256) {
        uint256 collateralShare = bb._userCollateralShare(address(this));
        uint256 collateralAmount = yieldBox.toAmount(bb._collateralId(), collateralShare, false);

        uint256 borrowPart = bb._userBorrowPart(address(this));
        Rebase memory _totalBorrowed = bb._totalBorrow();
        uint256 borrowAmount = _totalBorrowed.toElastic(borrowPart, true);
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));
        uint256 minBorrowAmount = bb._minBorrowAmount();

        leverageAmount = bound(leverageAmount, minBorrowAmount, maxBorrowAmount - borrowAmount); 
        return leverageAmount;
    }

    function _boundRemoveCollateralAmount(uint256 removeAmount, BigBang bb) internal view returns (uint256) {
        // get collateral amount
        uint256 collateralShare = bb._userCollateralShare(address(this));
        uint256 collateralAmount = yieldBox.toAmount(bb._collateralId(), collateralShare, false);

        // get borrowed and max borrowable
        uint256 borrowPart = bb._userBorrowPart(address(this));
        Rebase memory _totalBorrowed = bb._totalBorrow();
        uint256 borrowAmount = _totalBorrowed.toElastic(borrowPart, true);
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(mainBB)));

        // transform borrowable left into collateral
        (, uint256 rate) = oracle.peek("");
        uint256 remainingBorrowableAmount = maxBorrowAmount - borrowAmount;
        uint256 removableCollateral = (remainingBorrowableAmount * rate ) / bb._exchangeRatePrecision();
        // assure a 10% threshold for insolvency
        removableCollateral = removableCollateral - (removableCollateral * 1e4 / 1e5);
        removeAmount = bound(removeAmount, 1, removableCollateral); 
        return removeAmount;
    }

    function _boundRepayAmount(uint256 repayPart, BigBang bb) internal view returns (uint256) {
        uint256 userBorrowPart = bb._userBorrowPart(address(this));

        // assure a 10% threshold for repayment
        userBorrowPart = userBorrowPart - (userBorrowPart * 1e4 / 1e5);
        // if values are too low, method is still executed successfully, but can't really verify the results
        // repay at least `minBorrowAmount`; otherwise values might be too small to count
        repayPart = bound(repayPart, userBorrowPart/2, userBorrowPart);
        return repayPart;
    }

    function _spawnCollateral(uint256 _collateralAmount, address _to) internal {
        deal(address(mainBB._collateral()), _to, _collateralAmount);
        deal(address(secondaryBB._collateral()), _to, _collateralAmount);
    }

    function _spawnAsset(uint256 _assetAmount, address _to) internal {
        // cannot use `deal` because it can overflow supply on `burn` in some cases
        usdo.setMinterStatus(address(this), true);
        usdo.mint(_to, _assetAmount);

        // deal(address(mainBB._asset()), _to, _assetAmount);
    }

    function _getCollateralData(uint256 _collateralAmount, address _from, address _to, bool _skim)
        internal
        view
        returns (Module[] memory modules, bytes[] memory calls)
    {
        (modules, calls) = marketHelper.addCollateral(_from, _to, _skim, _collateralAmount, 0);
    }
    
    function _getRemoveCollateralData(uint256 _collateralShare, address _from, address _to) 
        internal
        view
        returns (Module[] memory modules, bytes[] memory calls)
    {
        (modules, calls) = marketHelper.removeCollateral(_from, _to, _collateralShare);
    }

    function _getBorrowData(uint256 _borrowAmount, address _from, address _to)
        internal
        view
        returns (Module[] memory modules, bytes[] memory calls)
    {
        (modules, calls) = marketHelper.borrow(_from, _to, _borrowAmount);
    }

    function _getRepayData(uint256 _repayPart, address _from, address _to) internal view  returns (Module[] memory modules, bytes[] memory calls) {
        (modules, calls) = marketHelper.repay(_from, _to, false, _repayPart);
    }

    // uses `mainBB` to convert amount to shares
    function _getLeverageDownData(uint256 _leverageAmount, address _from)
        internal
        view
        returns (Module[] memory modules, bytes[] memory calls)
    {
        uint256 share = yieldBox.toShare(mainBB._collateralId(), _leverageAmount, false);
        bytes memory leverageData = abi.encode(_leverageAmount);
        (modules, calls) = marketHelper.sellCollateral(_from, share, leverageData);
    }

    function _getLeverageUpData(uint256 _borrowAmount, uint256 _supplyAmount, address _from) 
        internal
        view
        returns (Module[] memory modules, bytes[] memory calls)
    {
        bytes memory leverageData = abi.encode(_borrowAmount);
        (modules, calls) = marketHelper.buyCollateral(_from, _borrowAmount, _supplyAmount, leverageData);
    }

    function _getLiquidateBadDebtData(address user, address from, address receiver, bytes memory liquidatorData, bool swapCollateral) 
        internal
        view
        returns (Module[] memory modules, bytes[] memory calls)
    {
        (modules, calls) = marketHelper.liquidateBadDebt(
            user, from, receiver, IMarketLiquidatorReceiver(address(liquidatorReceiver)), liquidatorData, swapCollateral
        );
    }

    function _getLiquidationData(address user, bytes memory liquidatorData, uint256 amount, uint256 liquidationBonus) 
        internal
        view
        returns (Module[] memory modules, bytes[] memory calls)
    {
        address[] memory users = new address[](1);
        users[0] = user;

        uint256[] memory borrowParts = new uint256[](1);
        borrowParts[0] = amount;

        uint256[] memory minLiquidationBonuses = new uint256[](1);
        minLiquidationBonuses[0] = liquidationBonus;

        IMarketLiquidatorReceiver[] memory receivers = new IMarketLiquidatorReceiver[](1);
        receivers[0] = IMarketLiquidatorReceiver(address(liquidatorReceiver));

        bytes[] memory receiverData = new bytes[](1);
        receiverData[0] = liquidatorData;

        (modules, calls) = 
            marketHelper.liquidate(users, borrowParts, minLiquidationBonuses, receivers, receiverData);
    }

    function _approveForCollateral(address txExecutor) internal override resetPrank(txExecutor) {
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

    function _approveBorrow(BigBang bb, address from, address to, uint256 share) internal resetPrank(from) {
        bb.approveBorrow(to, share);
    }

    function _addCollateral(
        uint256 collateralAmount,
        BigBang bb,
        address executor,
        address from,
        address depositTo,
        address onBehalfOf,
        bool skim
    ) internal returns (uint256 share) {
        {
            // deal collateral
            _spawnCollateral(collateralAmount, from);

            // approvals
            _approveForCollateral(from);
        }

        // deposit to YieldBox for market
        share = yieldBox.toShare(bb._collateralId(), collateralAmount, false);
        _depositToYieldBox(bb._collateral(), bb._collateralId(), share, from, depositTo);

        // get `before` state
        uint256 bbYieldBoxBalanceBefore = yieldBox.balanceOf(address(bb), bb._collateralId());
        uint256 userYieldBoxBalanceBefore = yieldBox.balanceOf(address(onBehalfOf), bb._collateralId());
        uint256 userCollateralBefore = bb._userCollateralShare(onBehalfOf);
        uint256 totalCollateralShareBefore = bb._totalCollateralShare();

        {
            (Module[] memory modules, bytes[] memory calls) =
                _getCollateralData(collateralAmount, from, onBehalfOf, skim);

            _resetPrank(executor);
            // it should emit 'LogAddCollateral'
            vm.expectEmit(true, true, true, false);
            emit LogAddCollateral(skim ? address(yieldBox) : from, onBehalfOf, share);
            bb.execute(modules, calls, true);
        }

        // checks
        {
            // get `after` state
            uint256 bbYieldBoxBalanceAfter = yieldBox.balanceOf(address(bb), bb._collateralId());
            uint256 userYieldBoxBalanceAfter = yieldBox.balanceOf(address(onBehalfOf), bb._collateralId());

            // it should increase 'userCollateralShare'
            uint256 resultedCollateral = bb._userCollateralShare(address(this));
            assertEq(resultedCollateral, userCollateralBefore + share);

            // it should increase 'totalCollateralShare'
            uint256 totalCollateralShare = bb._totalCollateralShare();
            assertEq(totalCollateralShare, totalCollateralShareBefore + share);

            if (skim) {
                // it should NOT increase market's YieldBox balance
                assertEq(bbYieldBoxBalanceBefore, bbYieldBoxBalanceAfter);
                // it should NOT decrease user's YieldBox balance
                assertEq(userYieldBoxBalanceBefore, userYieldBoxBalanceAfter);
            } else {
                // it should increase market's YieldBox balance
                assertEq(bbYieldBoxBalanceBefore + share, bbYieldBoxBalanceAfter);
                // it should decrease user's YieldBox balance for collateral token
                assertEq(userYieldBoxBalanceBefore - share, userYieldBoxBalanceAfter);
            }
        }
    }

    // to avoid stack too deep
    struct _BorrowInternal {
        Rebase totalBorrowAfter;
        Rebase totalBorrowBefore;
        uint256 userBorrowPartBefore;
        uint256 userBorrowPartAfter;
        uint256 userYieldBoxBalanceBefore;
        uint256 userYieldBoxBalanceAfter;
        uint256 usdoSupplyBefore;
        uint256 usdoSupplyAfter;
        uint256 feeAmount;
    }

    function _borrow(uint256 borrowAmount, BigBang bb, address executor, address from, address to)
        internal
        resetPrank(executor)
    {
        _BorrowInternal memory _data;
        // get `before` state
        _data.totalBorrowBefore = bb._totalBorrow();
        _data.userBorrowPartBefore = bb._userBorrowPart(to);
        _data.userYieldBoxBalanceBefore = yieldBox.amountOf(address(to), bb._assetId());
        _data.usdoSupplyBefore = usdo.totalSupply();

        uint256 feeAmount = bb.computeVariableOpeningFee(borrowAmount);
        (Module[] memory modules, bytes[] memory calls) = _getBorrowData(borrowAmount, from, to);

        // it should emit LogBorrow
        vm.expectEmit(true, true, true, false);
        emit LogBorrow(from, to, borrowAmount, feeAmount, borrowAmount + feeAmount);
        bb.execute(modules, calls, true);

        {
            // get `after` state
            _data.totalBorrowAfter = bb._totalBorrow();
            _data.userBorrowPartAfter = bb._userBorrowPart(to);
            _data.userYieldBoxBalanceAfter = yieldBox.amountOf(address(to), bb._assetId());

            // it should increase 'userBorrowPart'
            assertGt(_data.userBorrowPartAfter, _data.userBorrowPartBefore);

            // it should increase user's YieldBox position
            assertGt(_data.userYieldBoxBalanceAfter, _data.userYieldBoxBalanceBefore);
            assertEq(_data.userYieldBoxBalanceAfter, _data.userYieldBoxBalanceBefore + borrowAmount);

            // it should increase 'totalBorrow.base'
            assertGt(_data.totalBorrowAfter.base, _data.totalBorrowBefore.base);

            // it should increase 'totalBorrow.elastic'
            assertGt(_data.totalBorrowAfter.elastic, _data.totalBorrowBefore.elastic);

            // it should increase usdo supply
            _data.usdoSupplyAfter = usdo.totalSupply();
            assertEq(_data.usdoSupplyAfter, _data.usdoSupplyBefore + borrowAmount);

            if (feeAmount == 0) {
                // accrual taken into account
                assertApproxEqRel(_data.userBorrowPartAfter, _data.userBorrowPartBefore + borrowAmount, 0.01e18);
            } else {
                // accrual taken into account
                assertApproxEqRel(
                    _data.userBorrowPartAfter, _data.userBorrowPartBefore + borrowAmount + feeAmount, 0.01e18
                );
            }
        }
    }


    struct _RemoveCollateralInternal {
        uint256 bbYieldBoxBalanceBefore;
        uint256 userYieldBoxBalanceBefore;
        uint256 userCollateralBefore;
        uint256 totalCollateralShareBefore;
        uint256 bbYieldBoxBalanceAfter;
        uint256 userYieldBoxBalanceAfter;
        uint256 userCollateralAfter;
        uint256 totalCollateralShareAfter;
    }
    function _removeCollateral(uint256 addAmount, uint256 removeShare, uint256 borrowAmount, BigBang bb, address executor, address from, address to) internal {
        Module[] memory modules;
        bytes[] memory calls;
        _RemoveCollateralInternal memory _data;
        
        // **** Add collateral ****
        _addCollateral(addAmount, bb, address(this), from, to, to, false);
        
        // **** Borrow ****
        borrowAmount = _boundBorrowAmount(borrowAmount, addAmount);
        if (borrowAmount > 0) {
            _borrow(borrowAmount, bb, address(this), from, to);
        }
     
        // **** Remove collateral ****
        // get `before` state
        _data.bbYieldBoxBalanceBefore = yieldBox.balanceOf(address(bb), bb._collateralId());
        _data.userYieldBoxBalanceBefore = yieldBox.balanceOf(address(to), bb._collateralId());
        _data.userCollateralBefore = bb._userCollateralShare(to);
        _data.totalCollateralShareBefore = bb._totalCollateralShare();

        {   
            uint256 removeAmount;
            removeAmount = _boundRemoveCollateralAmount(removeAmount, bb);
            removeShare = yieldBox.toShare(bb._collateralId(), removeAmount, false);
            (modules, calls) =
                _getRemoveCollateralData(removeShare, from, to);

            _resetPrank(executor);

            vm.expectEmit(true, true, true, false);
            // it should emit 'LogRemoveCollateral'
            emit LogRemoveCollateral(from, to, removeShare);
            bb.execute(modules, calls, true);
        }

        _data.bbYieldBoxBalanceAfter = yieldBox.balanceOf(address(bb), bb._collateralId());
        _data.userYieldBoxBalanceAfter = yieldBox.balanceOf(address(to), bb._collateralId());
        _data.userCollateralAfter = bb._userCollateralShare(to);
        _data.totalCollateralShareAfter = bb._totalCollateralShare();

        // it should decrease 'userCollateralShare'
        assertEq(_data.userCollateralBefore - removeShare, _data.userCollateralAfter);

        // it should decrease 'totalCollateralShare'
        assertEq(_data.totalCollateralShareBefore - removeShare, _data.totalCollateralShareAfter);

        // it should decrease market's YieldBox balance
        assertEq(_data.bbYieldBoxBalanceBefore - removeShare, _data.bbYieldBoxBalanceAfter);

        // it should increase user's YieldBox balance
        assertEq(_data.userYieldBoxBalanceBefore + removeShare, _data.userYieldBoxBalanceAfter);
    }

    function _repay(uint256 collateralAmount, uint256 borrowAmount, uint256 repayPart, BigBang bb, address executor, address from, address to) internal {
        // **** Add collateral ****
        _addCollateral(collateralAmount, bb, address(this), from, to, to, false);
        
        // **** Borrow ****
        borrowAmount = _boundBorrowAmount(borrowAmount, collateralAmount);
        _borrow(borrowAmount, bb, address(this), from, to);

        skip(86400 * 10);
        _approveViaPearlmit({
            tokenType: TOKEN_TYPE_ERC1155,
            token: address(yieldBox),
            pearlmit: IPearlmit(address(pearlmit)),
            from: from,
            operator: address(bb),
            amount: type(uint200).max,
            expiration: uint48(block.timestamp),
            tokenId: mainBB._assetId()
        });

        bb.accrue();

        _BorrowInternal memory _data;
        // get `before` state
        _data.totalBorrowBefore = bb._totalBorrow();
        _data.userBorrowPartBefore = bb._userBorrowPart(to);
        _data.userYieldBoxBalanceBefore = yieldBox.amountOf(address(to), bb._assetId());
        _data.usdoSupplyBefore = usdo.totalSupply();

        repayPart = _boundRepayAmount(repayPart, bb);
        Rebase memory _totalBorrow = bb._totalBorrow();
        uint256 repayAmount = _totalBorrow.toElastic(repayPart, false);

        (Module[] memory modules, bytes[] memory calls) = _getRepayData(repayPart, from, to);
        _resetPrank(executor);

        // it should emit 'LogAccrue'
        // it should emit 'ReaccruedMarkets'
        //        │   │   │   ├─ emit LogAccrue(accruedAmount: 0, rate: 158440439 [1.584e8])
        // │   │   │   │   │   │   └─ ← [Stop]
        // │   │   │   │   │   └─ ← [Return]
        // │   │   │   │   ├─ emit ReaccruedMarkets(mainMarketIncluded: false)
        // it should emit 'LogRepay'
        vm.expectEmit(true, true, false, false);
        emit LogRepay(from, to, repayAmount, repayPart);
        bb.execute(modules, calls, true);

        // get `after` state
        _data.totalBorrowAfter = bb._totalBorrow();
        _data.userBorrowPartAfter = bb._userBorrowPart(to);
        _data.userYieldBoxBalanceAfter = yieldBox.amountOf(address(to), bb._assetId());
        _data.usdoSupplyAfter = usdo.totalSupply();

        // it should decrease 'userBorrowPart'
        assertGt(_data.userBorrowPartBefore, _data.userBorrowPartAfter, "A");

        // it should burn asset's supply
        assertGt(_data.usdoSupplyBefore, _data.usdoSupplyAfter, "b");

        // it should decrease 'totalBorrow.base'
        assertGt(_data.totalBorrowBefore.base, _data.totalBorrowAfter.base, "c");

        // it should decrease 'totalBorrow.elastic'
        assertGt(_data.totalBorrowBefore.elastic, _data.totalBorrowAfter.elastic, "D");
    }

    struct _LiquidateInternal {
        uint256 bbYieldBoxAssetBalanceBefore;
        uint256 bbYieldBoxAssetBalanceAfter;
        uint256 bbYieldBoxCollateralBalanceBefore;
        uint256 bbYieldBoxCollateralBalanceAfter;
        uint256 userAssetYieldBoxBalanceBefore;
        uint256 userAssetYieldBoxBalanceAfter;
        uint256 userCollateralYieldBoxBalanceBefore;
        uint256 userCollateralYieldBoxBalanceAfter;
        uint256 userCollateralBefore;
        uint256 userCollateralAfter;
        uint256 totalCollateralShareBefore;
        uint256 totalCollateralShareAfter;
        uint256 userBorrowPartBefore;
        uint256 userBorrowPartAfter;
        Rebase totalBorrowBefore;
        Rebase totalBorrowAfter;
        uint256 supplyFromBefore;
        uint256 supplyFromAfter;
        uint256 assetBalanceReceiverBefore;
        uint256 assetBalanceReceiverAfter;
        uint256 collateralBalanceReceiverBefore;
        uint256 collateralBalanceReceiverAfter;
    }
    
    function _liquidate(uint256 collateralAmount, uint256 oracleRate, uint256 swapAmount, BigBang bb, uint256 liquidationBonus) internal whenOracleRateIsEth {
        // **** Add collateral ****
        _resetPrank(address(this));
        _addCollateral(collateralAmount, bb, address(this), address(this), address(this), address(this), false);

        // **** Borrow ****
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(bb)));
        maxBorrowAmount = maxBorrowAmount - (maxBorrowAmount * 2e4 / 1e5);
        _resetPrank(address(this));
        _borrow(maxBorrowAmount, bb, address(this), address(this), address(this));

        _LiquidateInternal memory _data;
        // get `before` state
        _data.bbYieldBoxAssetBalanceBefore =  yieldBox.amountOf(address(bb), bb._assetId());
        _data.bbYieldBoxCollateralBalanceBefore =  yieldBox.amountOf(address(bb), bb._collateralId());
        _data.userAssetYieldBoxBalanceBefore = yieldBox.amountOf(address(address(this)), bb._assetId());
        _data.userCollateralYieldBoxBalanceBefore = yieldBox.amountOf(address(address(this)), bb._collateralId());
        _data.userCollateralBefore = bb._userCollateralShare(address(this));
        _data.totalCollateralShareBefore = bb._totalCollateralShare();
        _data.userBorrowPartBefore = bb._userBorrowPart(address(this));
        _data.totalBorrowBefore = bb._totalBorrow();
        _data.supplyFromBefore = usdo.totalSupply();

        // set liquidation rate
        oracle.set(oracleRate); 

        // compute asset amount
        SZeroXSwapData memory szeroXSwapData = SZeroXSwapData({
            sellToken: TOFTMock_test(payable(bb._collateral())).erc20(),
            buyToken: bb._asset(),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                ZeroXSwapperMockTarget_test.transferTokens.selector, bb._asset(), swapAmount
            )
        });
        SSwapData memory sswapData = SSwapData({
            minAmountOut: 0,
            data: szeroXSwapData
        });
        bytes memory swapData = abi.encode(sswapData);

        (Module[] memory modules, bytes[] memory calls) = _getLiquidationData(address(this), swapData, maxBorrowAmount, liquidationBonus);
        // it should emit 'Liquidated'
        vm.expectEmit(true, false, false, false);
        emit Liquidated(
            address(this),
            new address[](0),
            0,
            0,
            0,
            0
        );
        bb.execute(modules, calls, true);

        _data.bbYieldBoxAssetBalanceAfter =  yieldBox.amountOf(address(bb), bb._assetId());
        _data.bbYieldBoxCollateralBalanceAfter =  yieldBox.amountOf(address(bb), bb._collateralId());
        _data.userAssetYieldBoxBalanceAfter = yieldBox.amountOf(address(address(this)), bb._assetId());
        _data.userCollateralYieldBoxBalanceAfter = yieldBox.amountOf(address(address(this)), bb._collateralId());
        _data.userCollateralAfter = bb._userCollateralShare(address(this));
        _data.totalCollateralShareAfter = bb._totalCollateralShare();
        _data.userBorrowPartAfter = bb._userBorrowPart(address(this));
        _data.totalBorrowAfter = bb._totalBorrow();
        _data.supplyFromAfter =  usdo.totalSupply();

        // it should decrease 'userCollateralShare'
        assertGt(_data.userCollateralBefore, _data.userCollateralAfter);

        // it should decrease 'totalCollateralShare'
        assertGt(_data.totalCollateralShareBefore, _data.totalCollateralShareAfter);
        assertEq(_data.totalCollateralShareBefore - _data.totalCollateralShareAfter, _data.userCollateralBefore - _data.userCollateralAfter);

        // it should burn asset's supply
        assertGt(_data.supplyFromBefore, _data.supplyFromAfter);

        // it should decrease 'totalBorrow.base'
        assertGt(_data.totalBorrowBefore.base, _data.totalBorrowAfter.base);

        // it should decrease 'totalBorrow.elastic'
        assertGt(_data.totalBorrowBefore.elastic, _data.totalBorrowAfter.elastic);

        // it should decrease 'totalBorrow.elastic'
        assertGt(_data.userBorrowPartBefore, _data.userBorrowPartAfter);

        uint256 collateralShareRemoved = _data.totalCollateralShareBefore - _data.totalCollateralShareAfter;
        uint256 collateralAmountRemoved = yieldBox.toAmount(bb._assetId(), collateralShareRemoved, false);
        uint256 inAssetAmount = (collateralAmountRemoved * bb._exchangeRatePrecision()) / oracleRate;
        assertApproxEqRel(_data.userBorrowPartBefore - _data.userBorrowPartAfter, inAssetAmount, 0.1e18);

    }

    function _liquidateBadDebt(uint256 collateralAmount, uint256 borrowAmount, BigBang bb, address from, address to, bool swapCollateral) internal whenOracleRateIsEth {
        // **** Add collateral ****
        _resetPrank(address(this));
        _addCollateral(collateralAmount, bb, address(this), address(this), address(this), address(this), false);
        
        // **** Borrow ****
        uint256 maxBorrowAmount = _computeMaxBorrowAmount(collateralAmount, IMarket(address(bb)));
        // assure a 20% threshold for insolvency
        maxBorrowAmount = maxBorrowAmount - (maxBorrowAmount * 2e4 / 1e5);
        borrowAmount = maxBorrowAmount;
        _resetPrank(address(this));
        _borrow(borrowAmount, bb, address(this), address(this), address(this));

        _LiquidateInternal memory _data;
        // get `before` state
        _data.bbYieldBoxAssetBalanceBefore =  yieldBox.amountOf(address(bb), bb._assetId());
        _data.bbYieldBoxCollateralBalanceBefore =  yieldBox.amountOf(address(bb), bb._collateralId());
        _data.userAssetYieldBoxBalanceBefore = yieldBox.amountOf(address(address(this)), bb._assetId());
        _data.userCollateralYieldBoxBalanceBefore = yieldBox.amountOf(address(address(this)), bb._collateralId());
        _data.userCollateralBefore = bb._userCollateralShare(address(this));
        _data.totalCollateralShareBefore = bb._totalCollateralShare();
        _data.userBorrowPartBefore = bb._userBorrowPart(address(this));
        _data.totalBorrowBefore = bb._totalBorrow();
        _data.assetBalanceReceiverBefore = usdo.balanceOf(to);
        _data.collateralBalanceReceiverBefore = IERC20(bb._collateral()).balanceOf(to);

        // **** Liquidate bad debt ****

        uint256 existingAmount = _data.totalBorrowBefore.toElastic(_data.userBorrowPartBefore, false);

        _spawnAsset(existingAmount * 2, from);

        _data.supplyFromBefore = usdo.balanceOf(address(this));

        oracle.set(SMALL_AMOUNT);

        bytes memory swapData;
        uint256 inAssetAmount;
        if (swapCollateral) {
            // compute asset amount
            (, uint256 rate) = oracle.peek("");
            uint256 _collateralAmount = yieldBox.toAmount(bb._collateralId(), _data.userCollateralBefore, false);
            inAssetAmount =
                (_collateralAmount * (bb._exchangeRatePrecision() / FEE_PRECISION)) / rate;

            SZeroXSwapData memory szeroXSwapData = SZeroXSwapData({
                sellToken: TOFTMock_test(payable(bb._collateral())).erc20(),
                buyToken: bb._asset(),
                swapTarget: payable(swapperTarget),
                swapCallData: abi.encodeWithSelector(
                    ZeroXSwapperMockTarget_test.transferTokens.selector, bb._asset(), inAssetAmount
                )
            });
            SSwapData memory sswapData = SSwapData({
                minAmountOut: 0,
                data: szeroXSwapData
            });
            swapData = abi.encode(sswapData);
        }

        (Module[] memory modules, bytes[] memory calls) = _getLiquidateBadDebtData(address(this), from, to, swapData, swapCollateral);
        bb.execute(modules, calls, true);

        _data.bbYieldBoxAssetBalanceAfter =  yieldBox.amountOf(address(bb), bb._assetId());
        _data.bbYieldBoxCollateralBalanceAfter =  yieldBox.amountOf(address(bb), bb._collateralId());
        _data.userAssetYieldBoxBalanceAfter = yieldBox.amountOf(address(address(this)), bb._assetId());
        _data.userCollateralYieldBoxBalanceAfter = yieldBox.amountOf(address(address(this)), bb._collateralId());
        _data.userCollateralAfter = bb._userCollateralShare(address(this));
        _data.totalCollateralShareAfter = bb._totalCollateralShare();
        _data.userBorrowPartAfter = bb._userBorrowPart(address(this));
        _data.totalBorrowAfter = bb._totalBorrow();
        _data.supplyFromAfter = usdo.balanceOf(address(this));
        _data.assetBalanceReceiverAfter = usdo.balanceOf(to);
        _data.collateralBalanceReceiverAfter = IERC20(bb._collateral()).balanceOf(to);

        // it should set 'userCollateralShare' to 0
        assertGt(_data.userCollateralBefore, _data.userCollateralAfter);
        assertEq(_data.userCollateralAfter, 0);

        // it should decrease 'totalCollateralShare'
        assertGt(_data.totalCollateralShareBefore, _data.totalCollateralShareAfter);
        assertEq(_data.totalCollateralShareAfter, _data.totalCollateralShareBefore - _data.userCollateralBefore);

        // it should set 'userBorrowPart' to 0
        assertGt(_data.userBorrowPartBefore, _data.userBorrowPartAfter);
        assertEq(_data.userBorrowPartAfter, 0);

        // it should decrease 'totalBorrow.base'
        assertGt(_data.totalBorrowBefore.base, _data.totalBorrowAfter.base);

        // it should decrease 'totalBorrow.elastic'
        assertGt(_data.totalBorrowBefore.elastic, _data.totalBorrowAfter.elastic);

        // it should burn asset from 'from'
        assertGt(_data.supplyFromBefore, _data.supplyFromAfter);

        if (swapCollateral) {
            assertGt(_data.assetBalanceReceiverAfter, _data.assetBalanceReceiverBefore);
            assertEq(
                _data.assetBalanceReceiverAfter, _data.assetBalanceReceiverBefore + inAssetAmount);
        } else {
            assertGt(_data.collateralBalanceReceiverAfter, _data.collateralBalanceReceiverBefore);
        }
    }

    // to avoid stack too deep
    struct _LeverageInternal {
        Rebase totalBorrowAfter;
        Rebase totalBorrowBefore;
        uint256 userBorrowPartBefore;
        uint256 userBorrowPartAfter;
        uint256 userYieldBoxBalanceBefore;
        uint256 userYieldBoxBalanceAfter;
        uint256 usdoSupplyBefore;
        uint256 usdoSupplyAfter;
        uint256 feeAmount;
        uint256 bbYieldBoxBalanceBefore;
        uint256 bbYieldBoxBalanceAfter;
        uint256 userCollateralBefore;
        uint256 userCollateralAfter;
        uint256 totalCollateralShareBefore;
        uint256 totalCollateralShareAfter;
    }

    function _leverageDown(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount,
        BigBang bb,
        address executor,
        address from,
        address to,
        bool full
    ) internal {
        // add collateral
        _addCollateral(collateralAmount, bb, from, from, to, to, false);

        // borrow
        _borrow(borrowAmount, bb, from, from, to);

        leverageAmount = full ? collateralAmount : _boundLeverageDownAmount(leverageAmount, bb);

        _LeverageInternal memory _data;
        _data.userCollateralBefore = bb._userCollateralShare(to);
        _data.totalCollateralShareBefore = bb._totalCollateralShare();
        _data.bbYieldBoxBalanceBefore = yieldBox.balanceOf(address(bb), bb._collateralId());

        _data.totalBorrowBefore = bb._totalBorrow();
        _data.userBorrowPartBefore = bb._userBorrowPart(to);
        _data.userYieldBoxBalanceBefore = yieldBox.amountOf(address(to), bb._assetId());
        _data.usdoSupplyBefore = usdo.totalSupply();

        // leverage
        uint256 share = yieldBox.toShare(bb._collateralId(), leverageAmount, false);
        (Module[] memory modules, bytes[] memory calls) = _getLeverageDownData(leverageAmount, address(this));

        _resetPrank(executor);
        bb.execute(modules, calls, true);

        _data.userCollateralAfter = bb._userCollateralShare(to);
        _data.totalCollateralShareAfter = bb._totalCollateralShare();
        _data.bbYieldBoxBalanceAfter = yieldBox.balanceOf(address(bb), bb._collateralId());
        _data.totalBorrowAfter = bb._totalBorrow();
        _data.userBorrowPartAfter = bb._userBorrowPart(to);
        _data.userYieldBoxBalanceAfter = yieldBox.amountOf(address(to), bb._assetId());
        _data.usdoSupplyAfter = usdo.totalSupply();

        // it should decrease 'userCollateralShare'
        assertEq(_data.userCollateralBefore - share, _data.userCollateralAfter);

        // it should decrease 'totalCollateralShare'
        assertEq(_data.totalCollateralShareBefore - share, _data.totalCollateralShareAfter);

        // it should decrease asset's supply
        assertGt(_data.usdoSupplyBefore, _data.usdoSupplyAfter);

        if (full) {
            // it should empty 'userBorrowPart'
            assertEq(_data.userBorrowPartAfter, 0);
            assertGt(_data.userYieldBoxBalanceAfter, _data.userYieldBoxBalanceBefore);
        } 

        // it should decrease 'userBorrowPart'
        assertGt(_data.userBorrowPartBefore, _data.userBorrowPartAfter);

        // it should decrease 'totalBorrow.base'
        // it should decrease 'totalBorrow.elastic'
        assertGt(_data.totalBorrowBefore.base, _data.totalBorrowAfter.base);
        assertGt(_data.totalBorrowBefore.elastic, _data.totalBorrowAfter.elastic);

        uint256 amount = _data.usdoSupplyBefore - _data.usdoSupplyAfter;
        assertEq(_data.totalBorrowBefore.base - _data.totalBorrowAfter.base, amount);
        assertEq(_data.userBorrowPartBefore - _data.userBorrowPartAfter, amount);
    }

    function _leverageUp(
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 supplyAmount,
        BigBang bb,
        address executor,
        address from,
        address to
    ) internal {
        // add collateral
        _addCollateral(collateralAmount, bb, from, from, to, to, false);

        // borrow
        _borrow(borrowAmount, bb, from, from, to);

        leverageAmount = _boundLeverageUpAmount(leverageAmount, bb);

        _LeverageInternal memory _data;
        _data.userCollateralBefore = bb._userCollateralShare(to);
        _data.totalCollateralShareBefore = bb._totalCollateralShare();
        _data.bbYieldBoxBalanceBefore = yieldBox.balanceOf(address(bb), bb._collateralId());

        _data.totalBorrowBefore = bb._totalBorrow();
        _data.userBorrowPartBefore = bb._userBorrowPart(to);
        _data.userYieldBoxBalanceBefore = yieldBox.amountOf(address(to), bb._assetId());
        _data.usdoSupplyBefore = usdo.totalSupply();

         // leverage
        (Module[] memory modules, bytes[] memory calls) = _getLeverageUpData(leverageAmount, supplyAmount, address(this));

        _resetPrank(executor);
        bb.execute(modules, calls, true);

        _data.userCollateralAfter = bb._userCollateralShare(to);
        _data.totalCollateralShareAfter = bb._totalCollateralShare();
        _data.bbYieldBoxBalanceAfter = yieldBox.balanceOf(address(bb), bb._collateralId());
        _data.totalBorrowAfter = bb._totalBorrow();
        _data.userBorrowPartAfter = bb._userBorrowPart(to);
        _data.userYieldBoxBalanceAfter = yieldBox.amountOf(address(to), bb._assetId());
        _data.usdoSupplyAfter = usdo.totalSupply();


        // it should increase asset supply
        assertGt(_data.usdoSupplyAfter, _data.usdoSupplyBefore);
        assertEq(_data.usdoSupplyAfter, _data.usdoSupplyBefore + leverageAmount);

        // it should increase 'userBorrowPart'
        assertGt(_data.userBorrowPartAfter, _data.userBorrowPartBefore);
        assertApproxEqRel(
                _data.userBorrowPartAfter, _data.userBorrowPartBefore + leverageAmount, 0.01e18
            );

        // it should increase 'totalBorrow.base'
        assertGt(_data.totalBorrowAfter.base, _data.totalBorrowBefore.base);
        assertApproxEqRel(
            _data.totalBorrowAfter.base, _data.totalBorrowBefore.base + leverageAmount, 0.01e18
        );

        // it should increase 'totalBorrow.elastic'
        assertGt(_data.totalBorrowAfter.elastic, _data.totalBorrowBefore.elastic);
        assertApproxEqRel(
            _data.totalBorrowAfter.elastic, _data.totalBorrowBefore.elastic + leverageAmount, 0.01e18
        );
        
        // it should increase market's YieldBox balance
        assertGt(_data.bbYieldBoxBalanceAfter, _data.bbYieldBoxBalanceBefore);

        // it should increase 'userCollateralShare'
        assertGt(_data.userCollateralAfter, _data.userCollateralBefore);

        // it should increase 'totalCollateralShare'
        assertGt(_data.totalCollateralShareAfter, _data.totalCollateralShareBefore);
    }

    function _getBigBangInitData(BigBangInitData memory _bb)
        internal
        returns (
            BigBang._InitMemoryModulesData memory modulesData,
            BigBang._InitMemoryDebtData memory debtData,
            BigBang._InitMemoryData memory data
        )
    {
        BBCollateral bbCollateral = new BBCollateral();
        BBLiquidation bbLiq = new BBLiquidation();
        BBLeverage bbLev = new BBLeverage();
        BBBorrow bbBorrow = new BBBorrow();

        modulesData =
            BigBang._InitMemoryModulesData(address(bbLiq), address(bbBorrow), address(bbCollateral), address(bbLev));

        debtData = BigBang._InitMemoryDebtData(_bb.debtRateAgainstEth, _bb.debtRateMin, _bb.debtRateMax);

        data = BigBang._InitMemoryData(
            IPenrose(_bb.penrose),
            IERC20(_bb.collateral),
            _bb.collateralId,
            ITapiocaOracle(address(_bb.oracle)),
            DEFAULT_EXCHANGE_RATE,
            COLLATERALIZATION_RATE,
            LIQUIDATION_COLLATERALIZATION_RATE,
            _bb.leverageExecutor
        );
    }

    function _registerBBMarket(address _collateral, uint256 _collateralId, bool _isMain) internal returns (address) {
        // *** DEPLOYMENT *** //
        deal(address(usdo), address(leverageExecutor), type(uint256).max);
        deal(address(mainToken), address(leverageExecutor), type(uint256).max);
        deal(address(randomCollateral), address(leverageExecutor), type(uint256).max);

        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(
            BigBangInitData(
                address(penrose),
                _collateral, //collateral
                _collateralId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(address(leverageExecutor)),
                _isMain ? VALUE_ZERO : BB_DEBT_RATE_AGAINST_MAIN_MARKET,
                _isMain ? VALUE_ZERO : BB_MIN_DEBT_RATE,
                _isMain ? VALUE_ZERO : BB_MAX_DEBT_RATE
            )
        );

        address _contract =
            penrose.registerBigBang(address(bbMc), abi.encode(initModulesData, initDebtData, initMemoryData), true);

        // *** AFTER DEPLOYMENT *** //
        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = _contract;
        data[0] = abi.encodeWithSelector(BigBang.setDebtRateHelper.selector, address(debtHelper));
        penrose.executeMarketFn(mc, data, true);

        data[0] = abi.encodeWithSelector(BigBang.setAssetOracle.selector, address(assetOracle), "0x");
        penrose.executeMarketFn(mc, data, true);

        usdo.setMinterStatus(_contract, true);
        usdo.setBurnerStatus(_contract, true);

        if (_isMain) {
            penrose.setBigBangEthMarket(_contract);
        }

        vm.label(_contract, "BigBang market");
        return _contract;
    }

    // ************************** //
    // *** INTERNAL - SETTERS *** //
    // ************************** //
    function _setBorrowCap(uint256 borrowAmount, BigBang bb) internal {
        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(
            Market.setMarketConfig.selector,
            ITapiocaOracle(address(0)),
            "0x",
            0, //protocol fee
            0, //_liquidationBonusAmount
            0, //_minLiquidatorReward
            0, //_maxLiquidatorReward
            borrowAmount - 1, //_totalBorrowCap
            0, //_collateralizationRate
            0, //_liquidationCollateralizationRate
            0, //_minBorrowAmount
            0 //_minCollateralAmount
        );
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);
    }

    function _setLiquidationBonuAmount(uint256 amount, BigBang bb) internal {
        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(
            Market.setMarketConfig.selector,
            ITapiocaOracle(address(0)),
            "0x",
            0, //protocol fee
            amount, //_liquidationBonusAmount
            0, //_minLiquidatorReward
            0, //_maxLiquidatorReward
            0, //_totalBorrowCap
            0, //_collateralizationRate
            0, //_liquidationCollateralizationRate
            0, //_minBorrowAmount
            0 //_minCollateralAmount
        );
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);
    }

    function _setLeverageExecutor(address _le, BigBang bb) internal {
        address[] memory mc = new address[](1);
        bytes[] memory data = new bytes[](1);

        mc[0] = address(bb);
        data[0] = abi.encodeWithSelector(Market.setLeverageExecutor.selector, ILeverageExecutor(_le));
        (bool[] memory success,) = penrose.executeMarketFn(mc, data, true);
        assertTrue(success[0]);
    }
}
