// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';

import '../../singularity/interfaces/IFlashLoan.sol';
import '../../singularity/interfaces/ISingularity.sol';
import '../../../yieldbox/contracts/interfaces/IYieldBox.sol';

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
        address,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        bytes calldata
    ) external {
        ISingularity mixologist = ISingularity(msg.sender);
        IYieldBox yieldBox = IYieldBox(mixologist.yieldBox());

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
