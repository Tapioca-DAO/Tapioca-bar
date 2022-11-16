// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable var-name-mixedcase
// solhint-disable func-name-mixedcase

interface ITricryptoLiquidityPool {
    function coins(uint256 i) external view returns (address);

    function token() external view returns (address);

    function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount)
        external;

    function remove_liquidity(uint256 _amount, uint256[3] calldata min_amounts)
        external;

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        uint256 i,
        uint256 min_amount
    ) external;

    function calc_withdraw_one_coin(uint256 token_amount, uint256 i)
        external
        view
        returns (uint256);

    function calc_token_amount(uint256[3] calldata amounts, bool deposit)
        external
        view
        returns (uint256);
}
