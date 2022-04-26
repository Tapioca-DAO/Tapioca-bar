// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import '@boringcrypto/boring-solidity/contracts/ERC20.sol';
import '../mixologist/Mixologist.sol';
import '../bar/BeachBar.sol';
import './ILiquidationQueue.sol';

/// @title LiquidationQueue
/// @author @0xRektora, TapiocaDAO
// TODO: Capital efficiency? (register assets to strategies)
contract LiquidationQueue {
    LiquidationQueueMeta liquidationQueueMeta; // Meta-data for this contract
    Mixologist mixologist; // The target market

    // Bid pools, x% premium => bid pool
    // 0 ... 30 range
    mapping(uint256 => mapping(address => Bidder)) public bidPools;

    // The actual order book. Entries are stored only once a bid has been activated
    mapping(uint256 => OrderBookPoolEntry[1_000_000_000]) orderBookEntries;
    // Meta-data about the order book pool
    // Check `_isEpochRecycling` to see if the epoch is currently being recycled.
    mapping(uint256 => OrderBookPoolInfo) orderBookInfos;

    bool onlyOnce; // Contract init variable
    uint256 constant MAX_BID_POOLS = 30; // Maximum amount of pools

    uint256 constant EPOCH_MIN_LENGTH = 1 weeks; // Minimum length of an epoch

    /// @notice Acts as a 'constructor', should be called by a Mixologist market.
    /// @param  _liquidationQueueMeta Info about the liquidations.
    function init(LiquidationQueueMeta calldata _liquidationQueueMeta)
        external
    {
        require(!onlyOnce, 'LQ: Initialized');

        // We create the BeachBar vault to store the assets
        liquidationQueueMeta = _liquidationQueueMeta;
        Mixologist _mixologist = Mixologist(msg.sender);
        _registerAsset(_mixologist);

        // We initialize the pools to save gas on conditionals later on
        for (uint256 i = 0; i < MAX_BID_POOLS; ) {
            _initOrderBookPoolInfo(i);
            ++i;
        }
    }

    // ************** //
    // *** EVENTS *** //
    // ************** //

    event Bid(
        address indexed bidder,
        uint256 pool,
        uint256 amount,
        uint256 timestamp
    );

    event ActivateBid(
        address indexed bidder,
        uint256 pool,
        uint256 amount,
        uint256 timestamp
    );

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //

    // instead use min bid amount + fees + 10min cdr to counter denial of service attacks

    // ************* //
    // *** VIEWS *** //
    // ************* //

    function market() public view returns (string memory) {
        return mixologist.name();
    }

    function getOrderBookSize(uint256 pool) public view returns (uint256 x) {
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];

        if (_isEpochRecycling(poolInfo)) {
            x =
                poolInfo.lastArrayElement -
                poolInfo.nextBidPull +
                poolInfo.nextBidPush;
        } else {
            x = poolInfo.nextBidPush - poolInfo.nextBidPull;
        }
    }

    function getOrderBookPoolEntries(uint256 pool)
        public
        view
        returns (OrderBookPoolEntry[] memory x)
    {
        uint256 orderBookSize = getOrderBookSize(pool);
        x = new OrderBookPoolEntry[](orderBookSize); // Initialize the return array

        OrderBookPoolEntry[1_000_000_000] storage entries = orderBookEntries[
            pool
        ]; // Pointer to the entries

        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool]; // Info about the pool array indexes

        // We iterate from the next bid to pull to the next bid to push.
        for (
            (uint256 i, uint256 j) = (poolInfo.nextBidPull, 0);
            j != orderBookSize - 1;

        ) {
            x[j] = entries[i]; // Copy the entry to the return array

            // If we reached the upper band and there are still bids to pull.
            if (i == poolInfo.lastArrayElement) {
                // Go back to start of array.
                i = 0;
            } else {
                ++i;
            }
            ++j; // Follow the inserted elements
        }
    }

    // *********** //
    // *** TXS *** //
    // *********** //

    /// @notice Add a bid to a bid pool.
    /// @dev Create an entry in `bidPools`
    /// @param user Who will be able to execute the bid.
    /// @param pool To which pool the bid should go.
    /// @param amount The amount in asset to bid.
    function bid(
        address user,
        uint256 pool,
        uint256 amount
    ) external {
        require(pool < MAX_BID_POOLS, 'LQ: premium too high');

        Bidder memory bidder;
        bidder.amount = amount;
        bidder.timestamp = block.timestamp;

        bidPools[pool][user] = bidder;
        emit Bid(user, pool, amount, block.timestamp);
    }

    /// @notice Activate a bid by putting it in the order book.
    /// @dev Create an entry in `orderBook` and remove it from `bidPools`.
    /// @dev Spam vector attack is mitigated the min amount req., 10min CD + activation fees.
    /// @param pool The target pool.
    function activateBid(uint256 pool) external {
        Bidder memory bidder = bidPools[pool][msg.sender];
        require(
            block.timestamp + liquidationQueueMeta.activationTime >
                bidder.timestamp,
            'LQ: too soon'
        );

        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool]; // Info about the pool array indexes

        // Create a new order book entry
        OrderBookPoolEntry memory orderBookEntry;
        orderBookEntry.bidder = msg.sender;
        orderBookEntry.bidInfo = bidder;

        // Insert the order book entry and delete the bid entry from the given pool
        orderBookEntries[pool][poolInfo.nextBidPush] = orderBookEntry;
        delete bidPools[pool][msg.sender];

        // Update the `orderBookInfos`
        _updatePoolInfo(poolInfo, true);
        orderBookInfos[pool] = poolInfo;

        emit Bid(
            msg.sender,
            pool,
            orderBookEntry.bidInfo.amount,
            block.timestamp
        );
    }

    // **************** //
    // *** INTERNAL *** //
    // **************** //

    /// @notice Create an asset inside of BeachBar that will hold the funds
    /// @param _mixologist The address of Mixologist
    function _registerAsset(Mixologist _mixologist) internal {
        BeachBar bar = _mixologist.beachBar();

        (, address contractAddress, , ) = bar.assets(_mixologist.assetId());
        bar.registerAsset(
            TokenType.ERC20,
            contractAddress,
            IStrategy(address(0)),
            1
        );
    }

    /// @notice Called with `init`, setup the initial pool info values.
    /// @param pool The targeted pool
    function _initOrderBookPoolInfo(uint256 pool) internal {
        OrderBookPoolInfo memory poolInfo;
        poolInfo.poolId = uint32(pool);
        poolInfo.lastEpochTimestamp = block.timestamp;
        poolInfo.utilization = 10_000;
        orderBookInfos[pool] = poolInfo;
    }

    function _updatePoolInfo(OrderBookPoolInfo memory poolInfo, bool push)
        internal
    {
        if (push) {
            _setNextBidPush(poolInfo);
        } else {}
    }

    function _setNextBidPush(OrderBookPoolInfo memory poolInfo) internal {
        if (!_epochHandler(poolInfo)) {
            ++poolInfo.nextBidPush;

            // Update `lastArrayElement` only if the epoch is not recycling.
            if (!_isEpochRecycling(poolInfo)) {
                poolInfo.lastArrayElement = poolInfo.nextBidPush - 1;
            }
        }
    }

    /// @notice If the pool is ready for a new epoch, increment its epoch.
    /// @dev WARNING: Modifies the state of the passed memory `poolInfo`.
    /// @param poolInfo The pool info
    function _epochHandler(OrderBookPoolInfo memory poolInfo)
        internal
        returns (bool isNextEpoch)
    {
        if (_isNextEpochReady(poolInfo)) {
            poolInfo.nextBidPush = 0;
            poolInfo.lastEpochTimestamp = block.timestamp;
            poolInfo.utilization = poolInfo.nextBidPush - poolInfo.nextBidPull;
            ++poolInfo.epochs;
            orderBookInfos[poolInfo.poolId] = poolInfo;
            return true;
        }
    }

    /// 0 ... 1_000_000_000
    /// Epoch recycling happens when the next pushes indexes comes before the next pulls indexes.
    /// false array => 0 ... nextBidPull ... nextBidPush ... lastArrayElement ... 1_000_000_000
    /// true array => 0 ... nextBidPush ... nextBidPull ... lastArrayElement ... 1_000_000_000
    function _isEpochRecycling(OrderBookPoolInfo memory poolInfo)
        internal
        pure
        returns (bool arrType)
    {
        if (poolInfo.nextBidPull > poolInfo.nextBidPush) {
            arrType = true;
        }
    }

    /// @notice Check if an epoch is over.
    /// @dev An epoch is just the adjustment of the OrderBookPoolInfo
    /// @param poolInfo The pool info to check.
    /// @return True if the epoch is over.
    function _isNextEpochReady(OrderBookPoolInfo memory poolInfo)
        internal
        view
        returns (bool)
    {
        // Check if the EPOCH_MIN_LENGTH has passed since the last epoch.
        // Check that the `nextBidPool` is greater than the `utilization`.
        // Validate invariant of the indexes for a new epoch.
        return
            (block.timestamp - poolInfo.lastEpochTimestamp >
                EPOCH_MIN_LENGTH) &&
            (poolInfo.nextBidPull > poolInfo.utilization) &&
            (!_isEpochRecycling(poolInfo));
    }
}
