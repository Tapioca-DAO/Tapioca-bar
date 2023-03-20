// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

interface ITapiocaOFT {
    function sendToYB(
        uint256 amount,
        address depositFor,
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

    function balanceOf(address _user) external view returns (uint256);

    function isNative() external view returns (bool);

    function hostChainID() external view returns (uint256);

    function erc20() external view returns (address);
}
