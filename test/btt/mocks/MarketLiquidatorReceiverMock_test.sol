// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {IERC20} from "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

contract MarketLiquidatorReceiverMock_test {
    using BoringERC20 for IERC20;

    IERC20 public asset;

    constructor(IERC20 _token) {
        asset = _token;
    }

    function onCollateralReceiver(address, address, address, uint256, bytes calldata data) external returns (bool) {
        if (data.length == 0) return true; //do nothing
        uint256 amountToReceive = abi.decode(data, (uint256));
        asset.safeTransfer(msg.sender, amountToReceive);
        return true;
    }
}
