// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";

contract LeverageExecutorMock_test {
    using SafeERC20 for IERC20;

    bool public returnZero;

    ITapiocaOracle public oracle;

    uint256 public constant FEE_PRECISION = 1e5;
    uint256 public constant EXCHANGE_PRECISION = 1e18;

    function setReturnZero(bool _val) external {
        returnZero = _val;
    }

    function setOracle(ITapiocaOracle _oracle) external {
        oracle = _oracle;
    }

    function getCollateral(address, address, address collateralAddress, uint256, bytes calldata swapperData)
        external
        payable
        returns (uint256 collateralAmountOut)
    {
        if (returnZero) return 0;
        uint256 assetAmount = abi.decode(swapperData, (uint256));
        (, uint256 rate) = oracle.peek("");
        collateralAmountOut =
            (assetAmount * rate ) / EXCHANGE_PRECISION;

        IERC20(collateralAddress).safeTransfer(msg.sender, collateralAmountOut);
    }

    function getAsset(address, address, address assetAddress, uint256, bytes calldata swapperData)
        external
        returns (uint256 assetAmountOut)
    {
        if (returnZero) return 0;
        uint256 collateralAmount = abi.decode(swapperData, (uint256));
        (, uint256 rate) = oracle.peek("");
        assetAmountOut =
            (collateralAmount * EXCHANGE_PRECISION) / rate;
        IERC20(assetAddress).safeTransfer(msg.sender, assetAmountOut);
    }
}
