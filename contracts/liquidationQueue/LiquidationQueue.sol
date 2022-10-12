// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
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

    LiquidationQueueMeta public liquidationQueueMeta; // Meta-data for this contract.
    Mixologist public mixologist; // The target market.
    BeachBar public beachBar;
    YieldBox public yieldBox;

    uint256 public lqAssetId; // The liquidation queue BeachBar asset id.
    uint256 public marketAssetId; // The mixologist asset id.
    uint256 public liquidatedAssetId; // The asset that is being liquidated.
    bool public onlyOnce; // Contract init variable.

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
    function init(
        LiquidationQueueMeta calldata _liquidationQueueMeta,
        Mixologist _mixologist
    ) external {
        require(!onlyOnce, 'LQ: Initialized');

        liquidationQueueMeta = _liquidationQueueMeta;

        mixologist = Mixologist(_mixologist);
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
        uint256 usdoAmount,
        uint256 liquidatedAssetAmount,
        uint256 timestamp
    );

    event ActivateBid(
        address indexed caller,
        address indexed bidder,
        uint256 indexed pool,
        uint256 usdoAmount,
        uint256 liquidatedAssetAmount,
        uint256 collateralValue,
        uint256 timestamp
    );

    event RemoveBid(
        address indexed caller,
        address indexed bidder,
        uint256 indexed pool,
        uint256 usdoAmount,
        uint256 liquidatedAssetAmount,
        uint256 collateralValue,
        uint256 timestamp
    );

    event ExecuteBids(
        address indexed caller,
        uint256 indexed pool,
        uint256 usdoAmountExecuted,
        uint256 liquidatedAssetAmountExecuted,
        uint256 collateralLiquidated,
        uint256 timestamp
    );

    event Redeem(address indexed redeemer, address indexed to, uint256 amount);
    event BidSwapperUpdated(IBidder indexed _old, IBidder indexed _new);
    event UsdoSwapperUpdated(IBidder indexed _old, IBidder indexed _new);

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

    /// @notice Add a bid to a bid pool using stablecoins.
    /// @dev Works the same way as `bid` but performs a swap from the stablecoin to USDO
    ///      - if stableAssetId == usdoAssetId, no swap is performed
    /// @param user The bidder
    /// @param pool To which pool the bid should go
    /// @param stableAssetId Stablecoin YieldBox asset id
    /// @param amountIn Stablecoin amount
    /// @param data Extra data for swap operations
    function bidWithStable(
        address user,
        uint256 pool,
        uint256 stableAssetId,
        uint256 amountIn,
        bytes calldata data
    ) external Active {
        require(pool <= MAX_BID_POOLS, 'LQ: premium too high');
        require(
            address(liquidationQueueMeta.usdoSwapper) != address(0),
            'LQ: USD0 swapper not set'
        );

        uint256 usdoAssetId = beachBar.usdoAssetId();
        yieldBox.transfer(
            msg.sender,
            address(liquidationQueueMeta.usdoSwapper),
            stableAssetId,
            yieldBox.toShare(stableAssetId, amountIn, false)
        );

        uint256 usdoAmount = liquidationQueueMeta.usdoSwapper.swap(
            mixologist,
            stableAssetId,
            amountIn,
            data
        );

        Bidder memory bidder = _bid(user, pool, usdoAmount, true);

        uint256 usdoValueInLqAsset = bidder.swapOnExecute
            ? liquidationQueueMeta.bidExecutionSwapper.getOutputAmount(
                mixologist,
                usdoAssetId,
                usdoAmount,
                data
            )
            : bidder.usdoAmount;

        require(
            usdoValueInLqAsset >= liquidationQueueMeta.minBidAmount,
            'LQ: bid too low'
        );
    }

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
        uint256 assetId = lqAssetId;
        yieldBox.transfer(
            msg.sender,
            address(this),
            assetId,
            yieldBox.toShare(assetId, amount, false)
        );
        _bid(user, pool, amount, false);
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

        uint256 bidAmount = orderBookEntry.bidInfo.isUsdo
            ? orderBookEntry.bidInfo.usdoAmount
            : orderBookEntry.bidInfo.liquidatedAssetAmount;
        emit ActivateBid(
            msg.sender,
            user,
            pool,
            orderBookEntry.bidInfo.usdoAmount,
            orderBookEntry.bidInfo.liquidatedAssetAmount,
            orderBookEntry.bidInfo.swapOnExecute
                ? liquidationQueueMeta.bidExecutionSwapper.getOutputAmount(
                    mixologist,
                    beachBar.usdoAssetId(),
                    orderBookEntry.bidInfo.usdoAmount,
                    ''
                )
                : bidAmount,
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
        bool isUsdo = bidPools[pool][msg.sender].isUsdo;
        amountRemoved = isUsdo
            ? bidPools[pool][msg.sender].usdoAmount
            : bidPools[pool][msg.sender].liquidatedAssetAmount;
        delete bidPools[pool][msg.sender];

        uint256 lqAssetValue = amountRemoved;
        if (bidPools[pool][msg.sender].swapOnExecute) {
            lqAssetValue = liquidationQueueMeta
                .bidExecutionSwapper
                .getOutputAmount(
                    mixologist,
                    beachBar.usdoAssetId(),
                    amountRemoved,
                    ''
                );
        }
        require(
            lqAssetValue >= liquidationQueueMeta.minBidAmount,
            'LQ: bid does not exist'
        ); //save gas

        // Transfer assets
        uint256 assetId = isUsdo ? beachBar.usdoAssetId() : lqAssetId;
        yieldBox.transfer(
            address(this),
            user,
            assetId,
            yieldBox.toShare(assetId, amountRemoved, false)
        );

        emit RemoveBid(
            msg.sender,
            user,
            pool,
            isUsdo ? amountRemoved : 0,
            isUsdo ? 0 : amountRemoved,
            lqAssetValue,
            block.timestamp
        );
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

        uint256 orderBookIndex = bidIndexes[bidPosition];
        bool isUsdo = orderBookEntries[pool][orderBookIndex].bidInfo.isUsdo;

        amountRemoved = isUsdo
            ? orderBookEntries[pool][orderBookIndex].bidInfo.usdoAmount
            : orderBookEntries[pool][orderBookIndex]
                .bidInfo
                .liquidatedAssetAmount;

        // Clean expired bids.
        for (uint256 i = 0; i < bidIndexesLen; ) {
            if (bidIndexes[i] > poolInfo.nextBidPull) {
                bidIndexesLen = bidIndexes.length;
                bidIndexes[i] = bidIndexes[bidIndexesLen - 1];
                bidIndexes.pop();
            }
            unchecked {
                ++i;
            }
        }

        // There might be a case when all bids are expired
        if (bidIndexes.length > 0) {
            // Remove bid from the order book by replacing it with the last activated bid.
            orderBookIndex = bidIndexes[bidPosition];
            isUsdo = orderBookEntries[pool][orderBookIndex].bidInfo.isUsdo;
            amountRemoved = isUsdo
                ? orderBookEntries[pool][orderBookIndex].bidInfo.usdoAmount
                : orderBookEntries[pool][orderBookIndex]
                    .bidInfo
                    .liquidatedAssetAmount;
            orderBookEntries[pool][orderBookIndex] = orderBookEntries[pool][
                poolInfo.nextBidPush - 1
            ];

            // Remove latest userBidIndex
            bidIndexesLen = bidIndexes.length;
            bidIndexes[bidPosition] = bidIndexes[bidIndexesLen - 1];
            bidIndexes.pop();
        }
        // Transfer assets
        uint256 assetId = isUsdo ? beachBar.usdoAssetId() : lqAssetId;
        yieldBox.transfer(
            address(this),
            user,
            assetId,
            yieldBox.toShare(assetId, amountRemoved, false)
        );
        uint256 lqAssetValue = amountRemoved;
        if (orderBookEntries[pool][orderBookIndex].bidInfo.swapOnExecute) {
            lqAssetValue = liquidationQueueMeta
                .bidExecutionSwapper
                .getOutputAmount(
                    mixologist,
                    beachBar.usdoAssetId(),
                    amountRemoved,
                    ''
                );
        }
        emit RemoveBid(
            msg.sender,
            user,
            pool,
            isUsdo ? amountRemoved : 0,
            isUsdo ? 0 : amountRemoved,
            lqAssetValue,
            block.timestamp
        );
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

    function _viewBidderDiscountedCollateralAmount(
        Bidder memory entry,
        uint256 exchangeRate,
        uint256 poolId
    ) private view returns (uint256) {
        uint256 bidAmount = entry.isUsdo
            ? entry.usdoAmount
            : entry.liquidatedAssetAmount;
        uint256 liquidatedAssetAmount = entry.swapOnExecute
            ? liquidationQueueMeta.bidExecutionSwapper.getOutputAmount(
                mixologist,
                beachBar.usdoAssetId(),
                entry.usdoAmount,
                ''
            )
            : bidAmount;
        return
            _getPremiumAmount(
                _bidToCollateral(liquidatedAssetAmount, exchangeRate),
                poolId,
                MODE.ADD
            );
    }

    function _useEntireBidAmount(
        Bidder memory entry,
        uint256 discountedBidderAmount,
        uint256 exchangeRate,
        uint256 poolId,
        bytes memory swapData
    )
        private
        returns (
            uint256 finalCollateralAmount,
            uint256 finalDiscountedCollateralAmount,
            uint256 finalUsdoAmount
        )
    {
        finalCollateralAmount = entry.liquidatedAssetAmount;
        finalDiscountedCollateralAmount = discountedBidderAmount;
        finalUsdoAmount = entry.usdoAmount;
        //Execute the swap if USD0 was provided and it's different from the liqudation asset id
        if (entry.swapOnExecute) {
            yieldBox.transfer(
                address(this),
                address(liquidationQueueMeta.bidExecutionSwapper),
                beachBar.usdoAssetId(),
                yieldBox.toShare(
                    beachBar.usdoAssetId(),
                    entry.usdoAmount,
                    false
                )
            );

            finalCollateralAmount = liquidationQueueMeta
                .bidExecutionSwapper
                .swap(
                    mixologist,
                    beachBar.usdoAssetId(),
                    entry.usdoAmount,
                    swapData
                );
            finalDiscountedCollateralAmount = _getPremiumAmount(
                _bidToCollateral(finalCollateralAmount, exchangeRate),
                poolId,
                MODE.ADD
            );
        }
    }

    function _userPartiallyBidAmount(
        Bidder memory entry,
        uint256 collateralAmountToLiquidate,
        uint256 exchangeRate,
        uint256 poolId,
        bytes memory swapData
    )
        private
        returns (
            uint256 finalDiscountedCollateralAmount,
            uint256 finalUsdoAmount
        )
    {
        finalUsdoAmount = 0;
        finalDiscountedCollateralAmount = _getPremiumAmount(
            _collateralToBid(collateralAmountToLiquidate, exchangeRate),
            poolId,
            MODE.SUB
        );

        //Execute the swap if USD0 was provided and it's different from the liqudation asset id
        uint256 usdoAssetId = beachBar.usdoAssetId();
        if (entry.swapOnExecute) {
            finalUsdoAmount = liquidationQueueMeta
                .bidExecutionSwapper
                .getInputAmount(
                    mixologist,
                    usdoAssetId,
                    finalDiscountedCollateralAmount,
                    ''
                );

            yieldBox.transfer(
                address(this),
                address(liquidationQueueMeta.bidExecutionSwapper),
                usdoAssetId,
                yieldBox.toShare(usdoAssetId, finalUsdoAmount, false)
            );
            uint256 returnedCollateral = liquidationQueueMeta
                .bidExecutionSwapper
                .swap(mixologist, usdoAssetId, finalUsdoAmount, swapData);
            require(
                returnedCollateral >= finalDiscountedCollateralAmount,
                'need-more-collateral'
            );
        }
    }

    struct BidExecutionData {
        uint256 curPoolId;
        bool isBidAvail;
        OrderBookPoolInfo poolInfo;
        OrderBookPoolEntry orderBookEntry;
        OrderBookPoolEntry orderBookEntryCopy;
        uint256 totalPoolAmountExecuted;
        uint256 totalPoolCollateralLiquidated;
        uint256 totalUsdoAmountUsed;
        uint256 exchangeRate;
        uint256 discountedBidderAmount;
    }

    /// @notice Execute the liquidation call by executing the bids placed in the pools in ASC order.
    /// @dev Should only be called from Mixologist.
    ///      Mixologist should send the `collateralAmountToLiquidate` to this contract before calling this function.
    /// Tx will fail if it can't transfer allowed BeachBar asset from Mixologist.
    /// @param collateralAmountToLiquidate The amount of collateral to liquidate.
    /// @param swapData Swap data necessary for swapping USD0 to market asset; necessary only if bidder added USD0
    /// @return totalAmountExecuted The amount of asset that was executed.
    /// @return totalCollateralLiquidated The amount of collateral that was liquidated.
    function executeBids(
        uint256 collateralAmountToLiquidate,
        bytes calldata swapData
    )
        external
        returns (uint256 totalAmountExecuted, uint256 totalCollateralLiquidated)
    {
        require(msg.sender == address(mixologist), 'LQ: Only Mixologist');
        BidExecutionData memory data;

        (data.curPoolId, data.isBidAvail) = getNextAvailBidPool();
        data.exchangeRate = mixologist.exchangeRate();
        // We loop through all the bids for each pools until all the collateral is liquidated
        // or no more bid are available.
        while (collateralAmountToLiquidate > 0 && data.isBidAvail) {
            data.poolInfo = orderBookInfos[data.curPoolId];
            // Reset pool vars.
            data.totalPoolAmountExecuted = 0;
            data.totalPoolCollateralLiquidated = 0;
            // While bid pool is not empty and we haven't liquidated enough collateral.
            while (
                collateralAmountToLiquidate > 0 &&
                data.poolInfo.nextBidPull != data.poolInfo.nextBidPush
            ) {
                // Get the next bid.
                data.orderBookEntry = orderBookEntries[data.curPoolId][
                    data.poolInfo.nextBidPull
                ];
                data.orderBookEntryCopy = data.orderBookEntry;

                // Get the total amount of asset with the pool discount applied for the bidder.
                data
                    .discountedBidderAmount = _viewBidderDiscountedCollateralAmount(
                    data.orderBookEntryCopy.bidInfo,
                    data.exchangeRate,
                    data.curPoolId
                );

                // Check if the bidder can pay the remaining collateral to liquidate `collateralAmountToLiquidate`.
                if (data.discountedBidderAmount > collateralAmountToLiquidate) {
                    (
                        uint256 finalDiscountedCollateralAmount,
                        uint256 finalUsdoAmount
                    ) = _userPartiallyBidAmount(
                            data.orderBookEntryCopy.bidInfo,
                            collateralAmountToLiquidate,
                            data.exchangeRate,
                            data.curPoolId,
                            swapData
                        );

                    // Execute the bid.
                    balancesDue[
                        data.orderBookEntryCopy.bidder
                    ] += collateralAmountToLiquidate; // Write balance.

                    if (!data.orderBookEntry.bidInfo.isUsdo) {
                        data
                            .orderBookEntry
                            .bidInfo
                            .liquidatedAssetAmount -= finalDiscountedCollateralAmount; // Update bid entry amount.
                    } else {
                        data
                            .orderBookEntry
                            .bidInfo
                            .usdoAmount -= finalUsdoAmount;
                    }

                    // Update the total amount executed, the total collateral liquidated and collateral to liquidate.
                    data
                        .totalPoolAmountExecuted += finalDiscountedCollateralAmount;
                    data
                        .totalPoolCollateralLiquidated += collateralAmountToLiquidate;
                    collateralAmountToLiquidate = 0; // Since we have liquidated all the collateral.
                    data.totalUsdoAmountUsed += finalUsdoAmount;
                } else {
                    (
                        uint256 finalCollateralAmount,
                        uint256 finalDiscountedCollateralAmount,
                        uint256 finalUsdoAmount
                    ) = _useEntireBidAmount(
                            data.orderBookEntryCopy.bidInfo,
                            data.discountedBidderAmount,
                            data.exchangeRate,
                            data.curPoolId,
                            swapData
                        );

                    // Execute the bid.
                    balancesDue[
                        data.orderBookEntryCopy.bidder
                    ] += finalDiscountedCollateralAmount; // Write balance.
                    data.orderBookEntry.bidInfo.usdoAmount = 0; // Update bid entry amount.
                    data.orderBookEntry.bidInfo.liquidatedAssetAmount = 0; // Update bid entry amount.
                    // Update the total amount executed, the total collateral liquidated and collateral to liquidate.
                    data.totalUsdoAmountUsed += finalUsdoAmount;
                    data.totalPoolAmountExecuted += finalCollateralAmount;
                    data
                        .totalPoolCollateralLiquidated += finalDiscountedCollateralAmount;

                    collateralAmountToLiquidate -= finalDiscountedCollateralAmount;

                    // Since the current bid was fulfilled, get the next one.
                    unchecked {
                        ++data.poolInfo.nextBidPull;
                    }
                }
            }
            // Update the totals.
            totalAmountExecuted += data.totalPoolAmountExecuted;
            totalCollateralLiquidated += data.totalPoolCollateralLiquidated;
            orderBookInfos[data.curPoolId] = data.poolInfo; // Update the pool info for the current pool.
            // Look up for the next available bid pool.
            (data.curPoolId, data.isBidAvail) = getNextAvailBidPool();

            emit ExecuteBids(
                msg.sender,
                data.curPoolId,
                data.totalUsdoAmountUsed,
                data.totalPoolAmountExecuted,
                data.totalPoolCollateralLiquidated,
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

    /// @notice updates the bid swapper address
    /// @param _swapper thew new ICollateralSwaper contract address
    function setBidExecutionSwapper(IBidder _swapper) external {
        require(msg.sender == address(mixologist), 'unauthorized');
        emit BidSwapperUpdated(
            liquidationQueueMeta.bidExecutionSwapper,
            _swapper
        );
        liquidationQueueMeta.bidExecutionSwapper = _swapper;
        // yieldBox.setApprovalForAll(address(_swapper), true);
    }

    /// @notice updates the bid swapper address
    /// @param _swapper thew new ICollateralSwaper contract address
    function setUsdoSwapper(IBidder _swapper) external {
        require(msg.sender == address(mixologist), 'unauthorized');
        emit UsdoSwapperUpdated(liquidationQueueMeta.usdoSwapper, _swapper);
        liquidationQueueMeta.usdoSwapper = _swapper;
        // yieldBox.setApprovalForAll(address(_swapper), true);
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

    function _bid(
        address user,
        uint256 pool,
        uint256 amount,
        bool isUsdo
    ) internal returns (Bidder memory bidder) {
        bidder.usdoAmount = isUsdo ? amount : 0;
        bidder.liquidatedAssetAmount = isUsdo ? 0 : amount;
        bidder.timestamp = block.timestamp;
        bidder.isUsdo = isUsdo;
        bidder.swapOnExecute = isUsdo && lqAssetId != beachBar.usdoAssetId();

        bidPools[pool][user] = bidder;

        emit Bid(
            msg.sender,
            user,
            pool,
            isUsdo ? amount : 0, //USD0 amount
            isUsdo ? 0 : amount, //liquidated asset amount
            block.timestamp
        );

        // Clean the userBidIndex.
        uint256[] storage bidIndexes = userBidIndexes[user][pool];
        uint256 bidIndexesLen = bidIndexes.length;
        OrderBookPoolInfo memory poolInfo = orderBookInfos[pool];
        for (uint256 i = 0; i < bidIndexesLen; ) {
            if (bidIndexes[i] >= poolInfo.nextBidPull) {
                bidIndexesLen = bidIndexes.length;
                bidIndexes[i] = bidIndexes[bidIndexesLen - 1];
                bidIndexes.pop();
            }
            unchecked {
                ++i;
            }
        }
    }

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
