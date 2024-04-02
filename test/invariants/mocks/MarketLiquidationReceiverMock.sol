// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

contract MarketLiquidationReceiverMock {
    using BoringERC20 for IERC20;

    IERC20 public asset;

    constructor(address _token) {
        asset = IERC20(_token);
    }

    function onCollateralReceiver(address, address, address, uint256, bytes calldata data) external returns (bool) {
        uint256 amountToReceive = abi.decode(data, (uint256));
        asset.safeTransfer(msg.sender, amountToReceive);
        return true;
    }
}
