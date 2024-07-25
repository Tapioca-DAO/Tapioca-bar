// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// contracts
import {MarketLiquidatorReceiver} from "contracts/liquidators/MarketLiquidatorReceiver.sol";
import {IZeroXSwapper} from "tapioca-periph/interfaces/periph/IZeroXSwapper.sol";

// mocks
import {ZeroXSwapperMockTarget_test} from "../../../mocks/ZeroXSwapperMockTarget_test.sol";

// tests
import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";

contract MarketLiquidatorReceiver_onCollateralReceivertsol is MarketLiquidatorReceiver_Unit_Shared {
    function test_RevertWhen_MarketLiquidatorReceiverOnCollateralReceiverIsCalledFromRandomUser() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectRevert(MarketLiquidatorReceiver.NotAuthorized.selector);
        receiver.onCollateralReceiver(rndAddr, address(0), address(0), 0, "0x");
    }

    function test_RevertWhen_MarketLiquidatorReceiverOnCollateralReceiverIsCalledFromNon_whitelisted() external {
        address rndAddr = makeAddr("rndAddress");
        receiver.setAllowedParticipant(rndAddr, true);
        vm.expectRevert(MarketLiquidatorReceiver.WhitelistError.selector);
        receiver.onCollateralReceiver(rndAddr, address(0), address(0), 0, "0x");
    }

    function test_RevertWhen_MarketLiquidatorReceiverOnCollateralReceiverIsCalledAndTargetIsNotWhitelisted() external {
        address rndAddr = makeAddr("rndAddress");
        receiver.setAllowedParticipant(rndAddr, true);
        cluster.updateContract(0, address(this), true);
        vm.expectRevert(MarketLiquidatorReceiver.WhitelistError.selector);
        receiver.onCollateralReceiver(rndAddr, address(0), address(0), 0, "0x");
    }

    function test_RevertWhen_MarketLiquidatorReceiverOnCollateralReceiverIsCalledAndBalanceIsLess() external {
        address rndAddr = makeAddr("rndAddress");
        receiver.setAllowedParticipant(rndAddr, true);
        cluster.updateContract(0, address(this), true);
        cluster.updateContract(0, address(receiver), true);
        vm.expectRevert(MarketLiquidatorReceiver.NotEnough.selector);
        receiver.onCollateralReceiver(rndAddr, address(tWeth), address(usdo), 1 ether, "0x");
    }

    function test_WhenMarketLiquidatorReceiverOnCollateralReceiverIsCalledCorrectly() external {
        address rndAddr = makeAddr("rndAddress");
        receiver.setAllowedParticipant(rndAddr, true);
        cluster.updateContract(0, address(this), true);
        cluster.updateContract(0, address(receiver), true);

        uint256 amount = 1 ether;

        deal(address(tWeth), address(receiver), amount);
        deal(address(weth), address(tWeth), amount);
        deal(address(usdo), address(swapperTarget), amount);

        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(weth)),
            buyToken: IERC20(address(usdo)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                ZeroXSwapperMockTarget_test.transferTokensWithDust.selector, address(weth), address(usdo), amount, amount
                )
        });

        MarketLiquidatorReceiver.SSwapData memory swapData =
            MarketLiquidatorReceiver.SSwapData({minAmountOut: amount, data: zeroXSwapData});

        uint256 usdoBalanceBefore = usdo.balanceOf(address(this));
        receiver.onCollateralReceiver(rndAddr, address(tWeth), address(usdo), amount, abi.encode(swapData));
        uint256 usdoBalanceAfter = usdo.balanceOf(address(this));

        assertGt(usdoBalanceAfter, usdoBalanceBefore);
        assertEq(usdoBalanceAfter, amount);
    }
}
