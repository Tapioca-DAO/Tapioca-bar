// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable var-name-mixedcase
// solhint-disable func-name-mixedcase

import '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol';

import '../../mixologist/legacy/mocks/ERC20Mock.sol';

contract TricryptoLiquidityPoolMock {
    using BoringERC20 for IERC20;

    ERC20Mock public token;
    address public weth;

    constructor(address _weth) {
        weth = _weth;
        token = new ERC20Mock(10_000**18);
        token.freeMint(10_000**18);
    }

    function add_liquidity(uint256[3] calldata amounts, uint256) external {
        IERC20(weth).safeTransferFrom(msg.sender, address(this), amounts[2]); //WETH

        token.transfer(msg.sender, amounts[2]);
    }

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        uint256,
        uint256
    ) external {
        token.transferFrom(msg.sender, address(this), _token_amount);
        IERC20(weth).safeTransfer(msg.sender, _token_amount);
    }

    function calc_withdraw_one_coin(uint256 token_amount, uint256)
        external
        pure
        returns (uint256)
    {
        return token_amount;
    }

    function calc_token_amount(uint256[3] calldata amounts, bool)
        external
        pure
        returns (uint256)
    {
        return amounts[2];
    }
}
