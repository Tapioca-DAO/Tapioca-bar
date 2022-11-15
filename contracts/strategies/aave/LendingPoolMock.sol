// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

contract LendingPoolMock {
    using BoringERC20 for IERC20;

    IERC20 public asset;

    constructor(address _asset) {
        asset = IERC20(_asset);
    }

    function deposit(
        address,
        uint256 amount,
        address,
        uint16
    ) external {
        asset.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(
        address,
        uint256 amount,
        address to
    ) external returns (uint256) {
        uint256 extraAmount = (amount * 1_000) / 10_000; //simulate rewards
        asset.safeTransfer(to, amount + extraAmount);
        return amount + extraAmount;
    }

    function getUserAccountData(address)
        external
        view
        returns (
            uint256 totalCollateralETH,
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return (asset.balanceOf(address(this)), 0, 0, 0, 0, 0);
    }
}
