// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './bidders/IBidder.sol';

struct Bidder {
    bool isUsdo;
    bool swapOnExecute;
    uint256 usdoAmount;
    uint256 liquidatedAssetAmount;
    uint256 timestamp; // Timestamp in second of the last bid.
}

struct OrderBookPoolEntry {
    address bidder;
    Bidder bidInfo;
}

struct OrderBookPoolInfo {
    uint32 poolId;
    uint32 nextBidPull; // Next position in `entries` to start pulling bids from
    uint32 nextBidPush; // Next position in `entries` to start pushing bids to
}

struct LiquidationQueueMeta {
    uint256 activationTime; // Time needed before a bid can be activated for execution
    uint256 minBidAmount; // Minimum bid amount
    address feeCollector; // Address of the fee collector
    IBidder bidExecutionSwapper; //Allows swapping USD0 to collateral when a bid is executed
    IBidder usdoSwapper; //Allows swapping any other stablecoin to USD0
}

interface ILiquidationQueue {
    function init(LiquidationQueueMeta calldata, address mixologist) external;

    function onlyOnce() external view returns (bool);

    function setBidExecutionSwapper(address swapper) external;

    function setUsdoSwapper(address swapper) external;

    function getNextAvailBidPool()
        external
        view
        returns (uint256 i, bool available);

    function executeBids(
        uint256 collateralAmountToLiquidate,
        bytes calldata swapData
    ) external returns (uint256 amountExecuted, uint256 collateralLiquidated);
}
