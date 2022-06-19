// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

struct Bidder {
    uint256 amount; // Amount bid.
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
}

interface ILiquidationQueue {
    function init(LiquidationQueueMeta calldata) external;

    function getNextAvailBidPool()
        external
        view
        returns (uint256 i, bool available);

    function executeBids(uint256 collateralAmountToLiquidate)
        external
        returns (uint256 amountExecuted, uint256 collateralLiquidated);
}
