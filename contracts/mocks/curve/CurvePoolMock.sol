// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';
import '../../mixologist/legacy/mocks/ERC20Mock.sol';

contract CurvePoolMock {
    using BoringERC20 for IERC20;

    mapping(uint256 => address) public coins;

    uint256 public divider;

    constructor(address token0, address token1) {
        coins[0] = token0;
        coins[1] = token1;
        divider = 10**3;
    }

    function setDivider(uint256 div) external {
        divider = div;
    }

    function get_dy(
        uint256,
        uint256,
        uint256 dx
    ) external view returns (uint256) {
        if (divider == 0) return 0;
        return dx / divider; //hardcoded for weth>usdc ratio
    }

    function exchange(
        uint256,
        uint256 j,
        uint256 dx,
        uint256,
        bool
    ) external payable {
        if (divider == 0) return;
        address tokenOut = coins[j];
        uint256 freeMintAmount = dx / divider; //hardcoded for weth>usdc ratio
        ERC20Mock(tokenOut).freeMint(freeMintAmount);
        IERC20(tokenOut).safeTransfer(msg.sender, freeMintAmount);
    }
}
