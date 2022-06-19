// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../../mixologist/interfaces/IFlashLoan.sol';
import '../../bar/YieldBox.sol';
import '../../mixologist/Mixologist.sol';

contract FlashLoanMockAttacker is IFlashBorrower {
    function onFlashLoan(
        address sender,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external {}
}

contract FlashLoanMockSuccess is IFlashBorrower {
    function onFlashLoan(
        address sender,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external {
        Mixologist mixologist = Mixologist(msg.sender);
        YieldBox yieldBox = mixologist.yieldBox();

        token.approve(address(yieldBox), amount + fee);

        yieldBox.depositAsset(
            mixologist.assetId(),
            address(this),
            msg.sender,
            amount + fee,
            0
        );
    }
}
