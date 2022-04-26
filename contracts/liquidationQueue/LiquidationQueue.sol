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
    // poolId => bidIndex => bidEntry)
    mapping(uint256 => mapping(uint256 => OrderBookPoolEntry)) orderBookEntries;
    // Meta-data about the order book pool
    // Check `_isEpochRecycling` to see if the epoch is currently being recycled.
    mapping(uint256 => OrderBookPoolInfo) orderBookInfos;

    bool onlyOnce; // Contract init variable
    uint256 constant MAX_BID_POOLS = 30; // Maximum amount of pools

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

    function getOrderBookSize(uint256 pool) public view returns (uint256) {
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];
        return poolInfo.nextBidPush - 1 - poolInfo.nextBidPull;
    }

    // /!\ GAS COST /!\
    function getOrderBookPoolEntries(uint256 pool)
        external
        view
        returns (OrderBookPoolEntry[] memory x)
    {
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];
        uint256 orderBookSize = poolInfo.nextBidPush - 1 - poolInfo.nextBidPull;

        x = new OrderBookPoolEntry[](orderBookSize); // Initialize the return array

        mapping(uint256 => OrderBookPoolEntry)
            storage entries = orderBookEntries[pool];
        for (
            (uint256 i, uint256 j) = (poolInfo.nextBidPull, 0);
            i < poolInfo.nextBidPush;

        ) {
            x[j] = entries[i]; // Copy the entry to the return array

            ++i;
            ++j;
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
        require(pool <= MAX_BID_POOLS, 'LQ: premium too high');

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
        ++poolInfo.nextBidPush;
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
        orderBookInfos[pool] = poolInfo;
    }
}
