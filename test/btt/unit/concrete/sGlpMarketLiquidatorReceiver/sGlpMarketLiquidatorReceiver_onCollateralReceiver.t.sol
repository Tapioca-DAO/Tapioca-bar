// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external 
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// contracts
import {SGlpMarketLiquidatorReceiver} from "contracts/liquidators/sGlpMarketLiquidatorReceiver.sol";
import {IZeroXSwapper} from "tap-utils/interfaces/periph/IZeroXSwapper.sol";

// mocks
import {ZeroXSwapperMockTarget_test} from "../../../mocks/ZeroXSwapperMockTarget_test.sol";

// tests
import {MarketLiquidatorReceiver_Unit_Shared} from "../../shared/MarketLiquidatorReceiver_Unit_Shared.t.sol";

contract sGlpMarketLiquidatorReceiver_onCollateralReceiver is MarketLiquidatorReceiver_Unit_Shared {
    function test_RevertWhen_SGlpMarketLiquidatorReceiverOnCollateralReceiverIsCalledFromRandomUser() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectRevert(SGlpMarketLiquidatorReceiver.NotAuthorized.selector);
        sGlpReceiver.onCollateralReceiver(rndAddr, address(0), address(0), 0, "0x");
    }

    function test_RevertWhen_SGlpMarketLiquidatorReceiverOnCollateralReceiverIsCalledFromNon_whitelisted() external {
        address rndAddr = makeAddr("rndAddress");
        sGlpReceiver.setAllowedParticipant(rndAddr, true);
        cluster.setRoleForContract(address(this), keccak256("sGLPMARKET_LIQUIDATOR_RECEIVER_CALLER"), false);
        vm.expectRevert(abi.encodeWithSelector(SGlpMarketLiquidatorReceiver.WhitelistError.selector, "sGLPMARKET_LIQUIDATOR_RECEIVER_CALLER"));
        sGlpReceiver.onCollateralReceiver(rndAddr, address(0), address(0), 0, "0x");
    }

    function test_RevertWhen_SGlpMarketLiquidatorReceiverOnCollateralReceiverIsCalledAndTargetIsNotWhitelisted()
        external
    {
        address rndAddr = makeAddr("rndAddress");
        sGlpReceiver.setAllowedParticipant(rndAddr, true);
        cluster.setRoleForContract(address(this), keccak256("sGLPMARKET_LIQUIDATOR_RECEIVER_CALLER"), false);
        vm.expectRevert(abi.encodeWithSelector(SGlpMarketLiquidatorReceiver.WhitelistError.selector, "sGLPMARKET_LIQUIDATOR_RECEIVER_CALLER"));
        sGlpReceiver.onCollateralReceiver(rndAddr, address(0), address(0), 0, "0x");
    }

    function test_RevertWhen_SGlpMarketLiquidatorReceiverOnCollateralReceiverIsCalledAndBalanceIsLess() external {
        address rndAddr = makeAddr("rndAddress");
        sGlpReceiver.setAllowedParticipant(rndAddr, true);
        vm.expectRevert(SGlpMarketLiquidatorReceiver.NotEnough.selector);
        sGlpReceiver.onCollateralReceiver(rndAddr, address(tWeth), address(usdo), 1 ether, "0x");
    }

    function test_WhenSGlpMarketLiquidatorReceiverOnCollateralReceiverIsCalledCorrectly() external {
        address rndAddr = makeAddr("rndAddress");
        sGlpReceiver.setAllowedParticipant(rndAddr, true);

        uint256 amount = 1 ether;

        deal(address(tSglp), address(sGlpReceiver), amount); // for unwrap
        deal(address(sGlp), address(tSglp), amount); // for unwrap
        deal(address(usdo), address(swapperTarget), amount); // for usdc <> usdo swap
        deal(address(weth), address(gmxMock), amount); // for sGLp unstake


        IZeroXSwapper.SZeroXSwapData memory zeroXSwapData = IZeroXSwapper.SZeroXSwapData({
            sellToken: IERC20(address(weth)),
            buyToken: IERC20(address(usdo)),
            swapTarget: payable(swapperTarget),
            swapCallData: abi.encodeWithSelector(
                ZeroXSwapperMockTarget_test.transferTokensWithDust.selector, address(weth), address(usdo), amount, amount
            )
        });

        SGlpMarketLiquidatorReceiver.SGlpSwapData memory data = SGlpMarketLiquidatorReceiver.SGlpSwapData({
            token: address(weth),
            minAmountOut: 0,
            zeroXswapData: SGlpMarketLiquidatorReceiver.SSwapData({
                minAmountOut: amount,
                data: zeroXSwapData
            })
        });

        uint256 usdoBalanceBefore = usdo.balanceOf(address(this));
        sGlpReceiver.onCollateralReceiver(rndAddr, address(tSglp), address(usdo), amount, abi.encode(data));
        uint256 usdoBalanceAfter = usdo.balanceOf(address(this));

        assertGt(usdoBalanceAfter, usdoBalanceBefore);
        assertEq(usdoBalanceAfter, amount);
    }
}
