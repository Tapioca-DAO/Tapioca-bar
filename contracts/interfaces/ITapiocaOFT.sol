// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";

interface ITapiocaOFT is IERC20 {
    function sendToYB(
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        uint256 extraGasLimit,
        address zroPaymentAddress,
        bool strategyDeposit
    ) external payable;

    function retrieveFromYB(
        uint256 amount,
        uint256 assetId,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        bytes memory airdropAdapterParam,
        bool strategyWithdrawal
    ) external payable;

    function wrap(address _toAddress, uint256 _amount) external;

    function wrapNative(address _toAddress) external payable;

    function hostChainID() external view returns (uint256);

    function isNative() external view returns (bool);

    function erc20() external view returns (IERC20);
}
