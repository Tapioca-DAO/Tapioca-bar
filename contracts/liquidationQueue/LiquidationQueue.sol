// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/ERC20.sol';
import '../mixologist/Mixologist.sol';
import './ILiquidationQueue.sol';

enum MODE {
    ADD,
    SUB
}

/// @title LiquidationQueue
/// @author @0xRektora, TapiocaDAO
// TODO: Capital efficiency? (register assets to strategies) (farm strat for TAP)
// TODO: ERC20 impl?
contract LiquidationQueue {
    // ************ //
    // *** VARS *** //
    // ************ //

    /**
     * General information about the LiquidationQueue contract.
     */

    LiquidationQueueMeta liquidationQueueMeta; // Meta-data for this contract.
    Mixologist mixologist; // The target market.
    BeachBar beachBar;
    YieldBox yieldBox;

    uint256 public lqAssetId; // The liquidation queue BeachBar asset id.
    uint256 public marketAssetId; // The mixologist asset id.
    uint256 public liquidatedAssetId; // The asset that is being liquidated.
    bool onlyOnce; // Contract init variable.

    /**
     * Pools & order books information.
     */

    // Bid pools, x% premium => bid pool
    // 0 ... 30 range
    // poolId => userAddress => userBidInfo.
    mapping(uint256 => mapping(address => Bidder)) public bidPools;

    // The actual order book. Entries are stored only once a bid has been activated
    // poolId => bidIndex => bidEntry).
    mapping(uint256 => mapping(uint256 => OrderBookPoolEntry))
        public orderBookEntries;
    // Meta-data about the order book pool
    // poolId => poolInfo.
    mapping(uint256 => OrderBookPoolInfo) public orderBookInfos;

    /**
     * Ledger.
     */

    // user => orderBookEntries[poolId][bidIndex]
    mapping(address => mapping(uint256 => uint256[])) public userBidIndexes; // User current bids.

    // user => amountDue.
    mapping(address => uint256) public balancesDue; // Due balance of users.

    // ***************** //
    // *** CONSTANTS *** //
    // ***************** //

    uint256 constant MAX_BID_POOLS = 10; // Maximum amount of pools.
    // `amount` * ((`bidPool` * `PREMIUM_FACTOR`) / `PREMIUM_FACTOR_PRECISION`) = premium.
    uint256 constant PREMIUM_FACTOR = 100; // Premium factor.
    uint256 constant PREMIUM_FACTOR_PRECISION = 10_000; // Precision of the premium factor.

    uint256 private constant EXCHANGE_RATE_PRECISION = 1e18;

    uint256 private constant WITHDRAWAL_FEE = 50; // 0.5%
    uint256 private constant WITHDRAWAL_FEE_PRECISION = 10_000;

    // ************ //
    // *** INIT *** //
    // ************ //

    /// @notice Acts as a 'constructor', should be called by a Mixologist market.
    /// @param  _liquidationQueueMeta Info about the liquidations.
    function init(LiquidationQueueMeta calldata _liquidationQueueMeta)
        external
    {
        require(!onlyOnce, 'LQ: Initialized');

        liquidationQueueMeta = _liquidationQueueMeta;

        mixologist = Mixologist(msg.sender);
        liquidatedAssetId = mixologist.collateralId();
        marketAssetId = mixologist.assetId();
        beachBar = mixologist.beachBar();
        yieldBox = mixologist.yieldBox();

        lqAssetId = _registerAsset();

        IERC20(mixologist.asset()).approve(
            address(yieldBox),
            type(uint256).max
        );
        yieldBox.setApprovalForAll(address(mixologist), true);

        // We initialize the pools to save gas on conditionals later on.
        for (uint256 i = 0; i <= MAX_BID_POOLS; ) {
            _initOrderBookPoolInfo(i);
            ++i;
        }
        onlyOnce = true; // We set the init flag.
    }

    // ************** //
    // *** EVENTS *** //
    // ************** //

    event Bid(
        address indexed caller,
        address indexed bidder,
        uint256 indexed pool,
        uint256 amount,
        uint256 timestamp
    );

    event ActivateBid(
        address indexed caller,
        address indexed bidder,
        uint256 indexed pool,
        uint256 amount,
        uint256 timestamp
    );

    event RemoveBid(
        address indexed caller,
        address indexed bidder,
        uint256 indexed pool,
        uint256 amount
    );

    event ExecuteBids(
        address indexed caller,
        uint256 indexed pool,
        uint256 amountExecuted,
        uint256 collateralLiquidated,
        uint256 timestamp
    );

    event Redeem(address indexed redeemer, address indexed to, uint256 amount);

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //

    modifier Active() {
        require(onlyOnce, 'LQ: Not initialized');
        _;
    }

    // ************* //
    // *** VIEWS *** //
    // ************* //

    function market() public view returns (string memory) {
        return mixologist.name();
    }

    function getOrderBookSize(uint256 pool) public view returns (uint256 size) {
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];
        unchecked {
            size = poolInfo.nextBidPush - poolInfo.nextBidPull;
        }
    }

    // /!\ GAS COST /!\
    function getOrderBookPoolEntries(uint256 pool)
        external
        view
        returns (OrderBookPoolEntry[] memory x)
    {
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];
        uint256 orderBookSize = poolInfo.nextBidPush - poolInfo.nextBidPull;

        x = new OrderBookPoolEntry[](orderBookSize); // Initialize the return array.

        mapping(uint256 => OrderBookPoolEntry)
            storage entries = orderBookEntries[pool];
        for (
            (uint256 i, uint256 j) = (poolInfo.nextBidPull, 0);
            i < poolInfo.nextBidPush;

        ) {
            x[j] = entries[i]; // Copy the entry to the return array.

            unchecked {
                ++i;
                ++j;
            }
        }
    }

    // *********** //
    // *** TXS *** //
    // *********** //

    /// @notice Add a bid to a bid pool.
    /// @dev Create an entry in `bidPools`.
    ///      Clean the userBidIndex here instead of the `executeBids()` function to save on gas.
    /// @param user The bidder.
    /// @param pool To which pool the bid should go.
    /// @param amount The amount in asset to bid.
    function bid(
        address user,
        uint256 pool,
        uint256 amount
    ) external Active {
        require(pool <= MAX_BID_POOLS, 'LQ: premium too high');
        require(amount >= liquidationQueueMeta.minBidAmount, 'LQ: bid too low');

        // Transfer assets to the LQ contract.
        {
            uint256 assetId = lqAssetId;
            yieldBox.transfer(
                msg.sender,
                address(this),
                assetId,
                yieldBox.toShare(assetId, amount, false)
            );
        }

        Bidder memory bidder;
        bidder.amount = amount;
        bidder.timestamp = block.timestamp;

        bidPools[pool][user] = bidder;
        emit Bid(msg.sender, user, pool, amount, block.timestamp);

        // Clean the userBidIndex.
        uint256[] storage bidIndexes = userBidIndexes[user][pool];
        uint256 bidIndexesLen = bidIndexes.length;
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];
        for (uint256 i = 0; i < bidIndexesLen; ) {
            if (bidIndexes[i] >= poolInfo.nextBidPull) {
                bidIndexes[i] = bidIndexes[bidIndexesLen - 1];
                bidIndexes.pop();
            }
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Activate a bid by putting it in the order book.
    /// @dev Create an entry in `orderBook` and remove it from `bidPools`.
    /// @dev Spam vector attack is mitigated the min amount req., 10min CD + activation fees.
    /// @param user The user to activate the bid for.
    /// @param pool The target pool.
    function activateBid(address user, uint256 pool) external {
        Bidder memory bidder = bidPools[pool][user];
        require(
            block.timestamp >=
                bidder.timestamp + liquidationQueueMeta.activationTime,
            'LQ: too soon'
        );

        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool]; // Info about the pool array indexes.

        // Create a new order book entry.
        OrderBookPoolEntry memory orderBookEntry;
        orderBookEntry.bidder = user;
        orderBookEntry.bidInfo = bidder;

        // Insert the order book entry and delete the bid entry from the given pool.
        orderBookEntries[pool][poolInfo.nextBidPush] = orderBookEntry;
        delete bidPools[pool][user];

        // Add the index to the user bid index.
        userBidIndexes[user][pool].push(poolInfo.nextBidPush);

        // Update the `orderBookInfos`.
        unchecked {
            ++poolInfo.nextBidPush;
        }
        orderBookInfos[pool] = poolInfo;

        emit ActivateBid(
            msg.sender,
            user,
            pool,
            orderBookEntry.bidInfo.amount,
            block.timestamp
        );
    }

    /// @notice Remove a not yet activated bid from the bid pool.
    /// @dev Remove `msg.sender` funds.
    /// @param user The user to send the funds to.
    /// @param pool The pool to remove the bid from.
    /// @return amountRemoved The amount of the bid.
    function removeInactivatedBid(address user, uint256 pool)
        external
        returns (uint256 amountRemoved)
    {
        Bidder memory bidder = bidPools[pool][msg.sender];
        amountRemoved = bidder.amount;

        delete bidPools[pool][msg.sender];

        // Transfer assets
        uint256 assetId = lqAssetId;
        yieldBox.transfer(
            address(this),
            user,
            assetId,
            yieldBox.toShare(assetId, amountRemoved, false)
        );

        emit RemoveBid(msg.sender, user, pool, bidder.amount);
    }

    /// @notice Remove an activated bid from a given pool.
    /// @dev Clean the userBidIndex here instead of the `executeBids()` function to save on gas.
    ///      To prevent DoS attacks on `executeBids()` and gas costs, the last activated bid
    ///      will take the position of the removed bid.
    /// @param user The user to send the funds to.
    /// @param pool The target pool.
    /// @param bidPosition The position of the bid index inside the `userBidIndexes[msg.sender][pool]`.
    /// @return amountRemoved The amount of the bid removed.
    function removeBid(
        address user,
        uint256 pool,
        uint256 bidPosition
    ) external returns (uint256 amountRemoved) {
        uint256[] storage bidIndexes = userBidIndexes[msg.sender][pool];
        uint256 bidIndexesLen = bidIndexes.length;
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];

        // Clean expired bids.
        for (uint256 i = 0; i < bidIndexesLen; ) {
            if (bidIndexes[i] < poolInfo.nextBidPull) {
                // BUG: if bidIndex < poolInfo.nextBidPull, the bid has already been executed & ENHANCEMENT: bidIndexesLen was already declared
                bidIndexes[i] = bidIndexes[bidIndexesLen - 1];
                bidIndexes.pop();
            }
            unchecked {
                ++i;
            }
        }

        // Remove bid from the order book by replacing it with the last activated bid.
        uint256 orderBookIndex = bidIndexes[bidPosition];
        amountRemoved = orderBookEntries[pool][orderBookIndex].bidInfo.amount;
        orderBookEntries[pool][orderBookIndex] = orderBookEntries[pool][
            poolInfo.nextBidPush - 1
        ];

        // Remove userBidIndex
        bidIndexesLen = bidIndexes.length;
        bidIndexes[bidPosition] = bidIndexes[bidIndexesLen - 1];
        bidIndexes.pop();

        // Transfer assets
        uint256 assetId = lqAssetId;
        yieldBox.transfer(
            address(this),
            user,
            assetId,
            yieldBox.toShare(assetId, amountRemoved, false)
        );

        emit RemoveBid(msg.sender, user, pool, amountRemoved);
    }

    /// @notice Redeem a balance.
    /// @dev `msg.sender` is used as the redeemer.
    /// @param to The address to redeem to.
    function redeem(address to) external {
        require(balancesDue[msg.sender] > 0, 'LQ: No balance due');

        uint256 balance = balancesDue[msg.sender];
        uint256 fee = (balance * WITHDRAWAL_FEE) / WITHDRAWAL_FEE_PRECISION;
        uint256 redeemable = balance - fee;

        balancesDue[msg.sender] = 0;
        balancesDue[liquidationQueueMeta.feeCollector] += fee;

        uint256 assetId = liquidatedAssetId;
        yieldBox.transfer(
            address(this),
            to,
            assetId,
            yieldBox.toShare(assetId, redeemable, false)
        );

        emit Redeem(msg.sender, to, redeemable);
    }

    /// @notice Execute the liquidation call by executing the bids placed in the pools in ASC order.
    /// @dev Should only be called from Mixologist.
    ///      Mixologist should send the `collateralAmountToLiquidate` to this contract before calling this function.
    /// Tx will fail if it can't transfer allowed BeachBar asset from Mixologist.
    /// @param collateralAmountToLiquidate The amount of collateral to liquidate.
    /// @return totalAmountExecuted The amount of asset that was executed.
    /// @return totalCollateralLiquidated The amount of collateral that was liquidated.
    function executeBids(uint256 collateralAmountToLiquidate)
        external
        returns (uint256 totalAmountExecuted, uint256 totalCollateralLiquidated)
    {
        require(msg.sender == address(mixologist), 'LQ: Only Mixologist');

        (uint256 curPoolId, bool isBidAvail) = getNextAvailBidPool();
        require(isBidAvail, 'LQ: No available bid to fill');

        OrderBookPoolInfo memory poolInfo;
        OrderBookPoolEntry storage orderBookEntry;
        OrderBookPoolEntry memory orderBookEntryCopy;

        uint256 totalPoolAmountExecuted;
        uint256 totalPoolCollateralLiquidated;
        uint256 exchangeRate = mixologist.exchangeRate();
        uint256 discountedBidderAssetAmount;
        uint256 discountedBidderCollateralAmount;

        // We loop through all the bids for each pools until all the collateral is liquidated
        // or no more bid are available.
        while (collateralAmountToLiquidate > 0 && isBidAvail) {
            poolInfo = orderBookInfos[curPoolId];

            // Reset pool vars.
            totalPoolAmountExecuted = 0;
            totalPoolCollateralLiquidated = 0;

            // While bid pool is not empty and we haven't liquidated enough collateral.
            while (
                collateralAmountToLiquidate > 0 &&
                poolInfo.nextBidPull != poolInfo.nextBidPush
            ) {
                // Get the next bid.
                orderBookEntry = orderBookEntries[curPoolId][
                    poolInfo.nextBidPull
                ];
                orderBookEntryCopy = orderBookEntry;

                // Get the total amount of asset with the pool discount applied for the bidder.
                discountedBidderCollateralAmount = _getPremiumAmount(
                    _bidToCollateral(
                        orderBookEntryCopy.bidInfo.amount,
                        exchangeRate
                    ),
                    curPoolId,
                    MODE.ADD
                );

                // Check if the bidder can pay the remaining collateral to liquidate `collateralAmountToLiquidate`.
                if (
                    discountedBidderCollateralAmount >
                    collateralAmountToLiquidate
                ) {
                    // Execute the bid.
                    balancesDue[
                        orderBookEntryCopy.bidder
                    ] += collateralAmountToLiquidate; // Write balance.
                    discountedBidderAssetAmount = _getPremiumAmount(
                        _collateralToBid(
                            collateralAmountToLiquidate,
                            exchangeRate
                        ),
                        curPoolId,
                        MODE.SUB
                    );

                    orderBookEntry
                        .bidInfo
                        .amount -= discountedBidderAssetAmount; // Update bid entry amount.

                    // Update the total amount executed, the total collateral liquidated and collateral to liquidate.
                    totalPoolAmountExecuted += discountedBidderAssetAmount;
                    totalPoolCollateralLiquidated += collateralAmountToLiquidate;
                    collateralAmountToLiquidate = 0; // Since we have liquidated all the collateral.
                } else {
                    // Execute the bid.
                    balancesDue[
                        orderBookEntryCopy.bidder
                    ] += discountedBidderCollateralAmount; // Write balance.
                    orderBookEntry.bidInfo.amount = 0; // Update bid entry amount.

                    // Update the total amount executed, the total collateral liquidated and collateral to liquidate.
                    totalPoolAmountExecuted += orderBookEntryCopy
                        .bidInfo
                        .amount;
                    totalPoolCollateralLiquidated += discountedBidderCollateralAmount;
                    collateralAmountToLiquidate -= discountedBidderCollateralAmount;

                    // Since the current bid was fulfilled, get the next one.
                    unchecked {
                        ++poolInfo.nextBidPull;
                    }
                }
            }
            // Update the totals.
            totalAmountExecuted += totalPoolAmountExecuted;
            totalCollateralLiquidated += totalPoolCollateralLiquidated;

            orderBookInfos[curPoolId] = poolInfo; // Update the pool info for the current pool.

            // Look up for the next available bid pool.
            (curPoolId, isBidAvail) = getNextAvailBidPool();

            emit ExecuteBids(
                msg.sender,
                curPoolId,
                totalPoolAmountExecuted,
                totalPoolCollateralLiquidated,
                block.timestamp
            );
        }

        // Stack too deep
        {
            uint256 toSend = totalAmountExecuted;
            // Transfer the assets to the Mixologist.
            yieldBox.withdraw(
                lqAssetId,
                address(this),
                address(this),
                toSend,
                0
            );
            yieldBox.depositAsset(
                marketAssetId,
                address(this),
                address(mixologist),
                toSend,
                0
            );
        }
    }

    // ************* //
    // *** VIEWS *** //
    // ************* //

    /// @notice Get the next not empty bid pool in ASC order.
    /// @return i The bid pool id.
    /// @return available True if there is at least 1 bid available across all the order books.
    function getNextAvailBidPool()
        public
        view
        returns (uint256 i, bool available)
    {
        for (; i <= MAX_BID_POOLS; ) {
            if (getOrderBookSize(i) != 0) {
                available = true;
                break;
            }
            ++i;
        }
    }

    function userBidIndexLength(address user, uint256 pool)
        external
        view
        returns (uint256 len)
    {
        uint256[] memory bidIndexes = userBidIndexes[user][pool];

        uint256 bidIndexesLen = bidIndexes.length;
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];
        for (uint256 i = 0; i < bidIndexesLen; ) {
            if (bidIndexes[i] >= poolInfo.nextBidPull) {
                bidIndexesLen--;
            }
            unchecked {
                ++i;
            }
        }

        return bidIndexes.length;
    }

    // **************** //
    // *** INTERNAL *** //
    // **************** //

    /// @notice Create an asset inside of BeachBar that will hold the funds.
    function _registerAsset() internal returns (uint256) {
        (, address contractAddress, , ) = yieldBox.assets(marketAssetId);
        return
            yieldBox.registerAsset(
                TokenType.ERC20,
                contractAddress,
                IStrategy(address(0)),
                0
            );
    }

    /// @notice Called with `init`, setup the initial pool info values.
    /// @param pool The targeted pool.
    function _initOrderBookPoolInfo(uint256 pool) internal {
        OrderBookPoolInfo memory poolInfo;
        poolInfo.poolId = uint32(pool);
        orderBookInfos[pool] = poolInfo;
    }

    /// @notice Get the discount gained from a bid in a `poolId` given a `amount`.
    /// @param amount The amount of collateral to get the discount from.
    /// @param poolId The targeted pool.
    /// @param mode 0 subtract - 1 add.
    function _getPremiumAmount(
        uint256 amount,
        uint256 poolId,
        MODE mode
    ) internal pure returns (uint256) {
        uint256 premium = (amount * poolId * PREMIUM_FACTOR) /
            PREMIUM_FACTOR_PRECISION;
        return mode == MODE.ADD ? amount + premium : amount - premium;
    }

    /// @notice Convert a bid amount to a collateral amount.
    /// @param amount The amount of bid to convert.
    /// @param exchangeRate The exchange rate to use.
    function _bidToCollateral(uint256 amount, uint256 exchangeRate)
        internal
        pure
        returns (uint256)
    {
        return (amount * exchangeRate) / EXCHANGE_RATE_PRECISION;
    }

    /// @notice Convert a collateral amount to a bid amount.
    /// @param collateralAmount The amount of collateral to convert.
    /// @param exchangeRate The exchange rate to use.
    function _collateralToBid(uint256 collateralAmount, uint256 exchangeRate)
        internal
        pure
        returns (uint256)
    {
        return (collateralAmount * EXCHANGE_RATE_PRECISION) / exchangeRate;
    }
}
