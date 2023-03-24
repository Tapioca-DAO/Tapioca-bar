// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;
import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";

contract PenroseMock {
    YieldBox private immutable yieldBox;

    constructor(YieldBox _yieldBox, IERC20, IERC20, address) {
        yieldBox = _yieldBox;
    }
}
