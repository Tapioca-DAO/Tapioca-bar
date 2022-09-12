// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './MixologistStorage.sol';

contract MixologistSetter is MixologistStorage {
    /// @notice Used to set the swap path of closed liquidations
    /// @param _collateralSwapPath The Uniswap path .
    function setCollateralSwapPath(address[] calldata _collateralSwapPath)
        public
        onlyOwner
    {
        collateralSwapPath = _collateralSwapPath;
    }

    /// @notice Used to set the swap path of Asset -> TAP
    /// @param _tapSwapPath The Uniswap path .
    function setTapSwapPath(address[] calldata _tapSwapPath) public onlyOwner {
        tapSwapPath = _tapSwapPath;
    }

    /// @notice Set a new LiquidationQueue.
    /// @param _liquidationQueue The address of the new LiquidationQueue contract.
    /// It should be a new contract as `init()` can be called only one time.
    /// @param _liquidationQueueMeta The liquidation queue info.
    function setLiquidationQueue(
        ILiquidationQueue _liquidationQueue,
        LiquidationQueueMeta calldata _liquidationQueueMeta
    ) public onlyOwner {
        _liquidationQueue.init(_liquidationQueueMeta);
        liquidationQueue = _liquidationQueue;
    }

    /// @notice Execute an only owner function inside of the LiquidationQueue
    function updateLQExecutionSwapper(address _swapper) external onlyOwner {
        liquidationQueue.setBidExecutionSwapper(_swapper);
    }

    /// @notice Execute an only owner function inside of the LiquidationQueue
    function updateLQUsdoSwapper(address _swapper) external onlyOwner {
        liquidationQueue.setUsdoSwapper(_swapper);
    }
}
