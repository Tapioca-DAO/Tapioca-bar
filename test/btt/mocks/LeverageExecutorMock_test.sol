// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LeverageExecutorMock_test {
    using SafeERC20 for IERC20;

    function getCollateral(address, address, address collateralAddress, uint256, bytes calldata swapperData)
        external
        payable
        returns (uint256 collateralAmountOut)
    {
        collateralAmountOut = abi.decode(swapperData, (uint256));
        IERC20(collateralAddress).safeTransfer(msg.sender, collateralAmountOut);
    }

    function getAsset(address, address, address assetAddress, uint256, bytes calldata swapperData)
        external
        returns (uint256 assetAmountOut)
    {
        assetAmountOut = abi.decode(swapperData, (uint256));
        IERC20(assetAddress).safeTransfer(msg.sender, assetAmountOut);
    }
}
