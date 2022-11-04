// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

contract YearnVaultMock {
    using BoringERC20 for IERC20;

    IERC20 public asset;

    constructor(address _asset) {
        asset = IERC20(_asset);
    }

    function balanceOf(address) external view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function pricePerShare() external pure returns (uint256) {
        return 10**decimals();
    }

    function decimals() public pure returns (uint256) {
        return 5;
    }

    function deposit(uint256 amount, address) external returns (uint256) {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        return amount;
    }

    function withdraw(
        uint256 amount,
        address to,
        uint256
    ) external returns (uint256) {
        asset.safeTransfer(to, amount);
        return amount;
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
