// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SavingsDaiMock is ERC20 {
    using SafeERC20 for IERC20;

    address public dai;

    constructor(address _dai) ERC20("SDAI", "SDAI") {
        dai = _dai;
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function maxRedeem(address) external view returns (uint256) {
        return IERC20(dai).balanceOf(address(this));
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256) {
        IERC20(dai).safeTransfer(receiver, assets);
        _burn(owner, assets);
        return assets;
    }

    function previewWithdraw(uint256 assets) external pure returns (uint256) {
        return assets;
    }

    function previewRedeem(uint256 assets) external pure returns (uint256) {
        return assets;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256) {
        _mint(receiver, assets);
        IERC20(dai).safeTransferFrom(msg.sender, address(this), assets);
        return assets;
    }

    function maxWithdraw(address) external view returns (uint256) {
        return totalSupply();
    }

    function convertToShares(uint256 assets) external pure returns (uint256) {
        return assets;
    }

    function redeem(uint256 assets, address receiver, address owner) external returns (uint256) {
        IERC20(dai).safeTransfer(receiver, assets);
        _burn(owner, assets);
        return assets;
    }
}
