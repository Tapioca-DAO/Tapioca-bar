// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../interfaces/IERC3156FlashBorrower.sol";
import "../interfaces/IERC3156FlashLender.sol";

contract FlashMaliciousBorrowerMock is IERC3156FlashBorrower {
    using BoringERC20 for IERC20;
    IERC3156FlashLender lender;

    constructor(IERC3156FlashLender _lender) {
        lender = _lender;
    }

    /// @dev ERC-3156 Flash loan callback
    function onFlashLoan(
        address initiator,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external view override returns (bytes32) {
        require(msg.sender == address(lender), "FlashBorrower: untrusted");
        require(initiator == address(this), "FlashBorrower: not the initiator");
        //do stuff here
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    function flashBorrow(address token, uint256 amount) public {
        //missing approve for repayment
        lender.flashLoan(this, token, amount, "");
    }
}

contract FlashBorrowerMock is IERC3156FlashBorrower {
    using BoringERC20 for IERC20;
    IERC3156FlashLender lender;

    constructor(IERC3156FlashLender _lender) {
        lender = _lender;
    }

    /// @dev ERC-3156 Flash loan callback
    function onFlashLoan(
        address initiator,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external view override returns (bytes32) {
        require(msg.sender == address(lender), "FlashBorrower: untrusted");
        require(initiator == address(this), "FlashBorrower: not the initiator");
        //do stuff here
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    function flashBorrow(address token, uint256 amount) public {
        approveRepayment(token, amount);
        lender.flashLoan(this, token, amount, "");
    }

    function approveRepayment(address token, uint256 amount) public {
        uint256 _allowance = IERC20(token).allowance(
            address(this),
            address(lender)
        );
        uint256 _fee = lender.flashFee(token, amount);
        uint256 _repayment = amount + _fee;
        IERC20(token).approve(address(lender), _allowance + _repayment);
    }
}
