// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Tapioca
import {PearlmitHandler, IPearlmit} from "tapioca-periph/pearlmit/PearlmitHandler.sol";

contract TOFTMock is ERC20, PearlmitHandler {
    using SafeERC20 for IERC20;

    address public erc20_;

    error TOFTMock_NotValid();
    
    constructor(address _erc20, IPearlmit _pearlmit) ERC20("TOFTMock", "TFTM") PearlmitHandler(_pearlmit) {
        erc20_ = _erc20;
    }

    function wrap(address _fromAddress, address _toAddress, uint256 _amount)
        external
        payable
        returns (uint256 minted)
    {
        _mint(_toAddress, _amount);
        if (erc20_ != address(0)) {
            // IERC20(erc20_).safeTransferFrom(_fromAddress, address(this), _amount);
            bool isErr = pearlmit.transferFromERC20(_fromAddress, address(this), erc20_, _amount);
            if (isErr) revert TOFTMock_NotValid();
        } else {
            require(msg.value == _amount, "TOFTMock: failed to received ETH");
        }

        return _amount;
    }

    function unwrap(address _toAddress, uint256 _amount) external {
        _burn(msg.sender, _amount);
        if (erc20_ != address(0)) {
            IERC20(erc20_).safeTransfer(_toAddress, _amount);
        } else {
            (bool sent,) = _toAddress.call{value: _amount}("");
            require(sent, "TOFTMock: failed to transfer ETH");
        }
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function erc20() external view returns (address) {
        return erc20_;
    }

    receive() external payable {}
}
