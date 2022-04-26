// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

struct Bidder {
    uint256 amount; // Amount bid.
    uint256 timestamp; // Timestamp in second of the bid.
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
    uint16 activationTime; // Time needed before a bid can be activated for execution
}

interface ILiquidationQueue {
    function init(LiquidationQueueMeta calldata) external;
}
