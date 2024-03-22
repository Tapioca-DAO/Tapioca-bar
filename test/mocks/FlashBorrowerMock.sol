// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC3156FlashBorrowerMock {
    function onFlashLoan(address initiator, address token, uint256 amount, uint256 fee, bytes calldata data)
        external
        returns (bytes32);
}

interface IERC3156FlashLenderMock {
    function maxFlashLoan(address token) external view returns (uint256);

    function flashFee(address token, uint256 amount) external view returns (uint256);

    function flashLoan(IERC3156FlashBorrowerMock receiver, address token, uint256 amount, bytes calldata data)
        external
        returns (bool);
}

contract FlashMaliciousBorrowerMock is IERC3156FlashBorrowerMock {
    using SafeERC20 for IERC20;

    IERC3156FlashLenderMock lender;

    constructor(IERC3156FlashLenderMock _lender) {
        lender = _lender;
    }

    /// @dev ERC-3156 Flash loan callback
    function onFlashLoan(address initiator, address, uint256, uint256, bytes calldata)
        external
        view
        override
        returns (bytes32)
    {
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

contract FlashBorrowerMock is IERC3156FlashBorrowerMock {
    using SafeERC20 for IERC20;

    IERC3156FlashLenderMock lender;

    constructor(IERC3156FlashLenderMock _lender) {
        lender = _lender;
    }

    /// @dev ERC-3156 Flash loan callback
    function onFlashLoan(address initiator, address, uint256, uint256, bytes calldata)
        external
        view
        override
        returns (bytes32)
    {
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
        uint256 _allowance = IERC20(address(lender)).allowance(address(this), address(lender));
        uint256 _fee = lender.flashFee(token, amount);
        uint256 _repayment = amount + _fee;
        IERC20(token).approve(address(lender), _allowance + _repayment);
        // IERC20(address(lender)).approve(
        //     address(lender),
        //     _allowance + _repayment
        // );
    }
}
