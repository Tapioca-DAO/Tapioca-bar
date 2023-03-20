// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

interface IUSD0 {
    struct LeverageLZData {
        uint16 lzDstChainId;
        address zroPaymentAddress;
        bytes airdropAdapterParam;
        address refundAddress;
    }

    struct LeverageSwapData {
        address tokenOut;
        uint256 amountOutMin;
        bytes data;
    }
    struct LeverageExternalContractsData {
        address swapper;
        address proxy;
        address tOft;
        address srcMarket;
        uint16 srcLzChainId;
        uint256 sendToYBExtraGasLimit;
        uint256 executeOnChainGasLimit;
        uint256 dstAssetId;
    }

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function mint(address _to, uint256 _amount) external;

    function burn(address _from, uint256 _amount) external;

    function sendForLeverage(
        uint256 amount,
        address leverageFor,
        LeverageLZData calldata lzData,
        LeverageSwapData calldata swapData,
        LeverageExternalContractsData calldata externalData
    ) external payable;
}
