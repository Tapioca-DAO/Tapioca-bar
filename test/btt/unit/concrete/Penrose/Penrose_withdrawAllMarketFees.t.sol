// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {BigBang_Unit_Shared} from "../../shared/BigBang_Unit_Shared.t.sol";

// external
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";

// dependencies
import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";
import {IMarket} from "tap-utils/interfaces/bar/ISingularity.sol";
import {ITwTap} from "tap-utils/interfaces/tap-token/ITwTap.sol";

import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";

contract Penrose_withdrawAllMarketFees is BigBang_Unit_Shared {
    function test_RevertWhen_WithdrawAllMarketFeesIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        IMarket[] memory markets = new IMarket[](1);
        markets[0] = IMarket(rndAddr);

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.withdrawAllMarketFees(markets, ITwTap(rndAddr));
        vm.stopPrank();
    }

    function test_RevertWhen_WithdrawAllMarketFeesIsCalledFromOwnerAndPenroseIsPaused() external {
        penrose.setPause(true);
        address rndAddr = makeAddr("rndAddress");
        IMarket[] memory markets = new IMarket[](1);
        markets[0] = IMarket(rndAddr);

        vm.expectRevert();
        penrose.withdrawAllMarketFees(markets, ITwTap(rndAddr));
    }

    function test_RevertWhen_WithdrawAllMarketFeesIsCalledFromOwnerAndTwTapIsAddress0() external {
        address rndAddr = makeAddr("rndAddress");
        IMarket[] memory markets = new IMarket[](1);
        markets[0] = IMarket(rndAddr);

        vm.expectRevert();
        penrose.withdrawAllMarketFees(markets, ITwTap(address(0)));
    }

    function test_WhenWithdrawAllMarketFeesIsCalledFromOwner() external {
        BigBang mc = new BigBang();

        address rndAddr = makeAddr("rndAddress");
        penrose.registerBigBangMasterContract(address(mc), IPenrose.ContractType.lowRisk);

        penrose.setUsdoToken(address(usdo), usdoId);

        (
            BigBang._InitMemoryModulesData memory initModulesData,
            BigBang._InitMemoryDebtData memory initDebtData,
            BigBang._InitMemoryData memory initMemoryData
        ) = _getBigBangInitData(
            BigBangInitData(
                address(penrose),
                address(mainToken), //asset
                mainTokenId,
                ITapiocaOracle(address(oracle)),
                ILeverageExecutor(address(rndAddr)),
                0,
                0,
                0
            )
        );
        address _contract =
            penrose.registerBigBang(address(mc), abi.encode(initModulesData, initDebtData, initMemoryData), true);
        assertTrue(penrose.isMarketRegistered(_contract));

        IMarket[] memory markets = new IMarket[](1);
        markets[0] = IMarket(_contract);
        penrose.withdrawAllMarketFees(markets, ITwTap(address(rndAddr)));
    }
}
