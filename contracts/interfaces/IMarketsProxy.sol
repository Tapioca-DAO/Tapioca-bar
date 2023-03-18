// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

interface IMarketsProxy {
    /// @notice execute Singularity methods on another chain
    /// @param _dstChainId te LayerZero destination chain id
    /// @param _marketDstAddress destination Market address
    /// @param _marketCalls Market calls
    /// @param _adapterParams custom adapters
    function executeOnChain(
        uint16 _dstChainId,
        address _marketDstAddress,
        bytes[] memory _marketCalls,
        bytes memory _adapterParams
    ) external payable;
}
