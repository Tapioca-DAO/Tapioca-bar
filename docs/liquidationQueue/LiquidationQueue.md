# LiquidationQueue

*@0xRektora, TapiocaDAO*

> LiquidationQueue





## Methods

### activateBid

```solidity
function activateBid(address user, uint256 pool) external nonpayable
```

Activate a bid by putting it in the order book.

*Create an entry in `orderBook` and remove it from `bidPools`.Spam vector attack is mitigated the min amount req., 10min CD + activation fees.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to activate the bid for. |
| pool | uint256 | The target pool. |

### balancesDue

```solidity
function balancesDue(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### bid

```solidity
function bid(address user, uint256 pool, uint256 amount) external nonpayable
```

Add a bid to a bid pool.

*Create an entry in `bidPools`.      Clean the userBidIndex here instead of the `executeBids()` function to save on gas.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The bidder. |
| pool | uint256 | To which pool the bid should go. |
| amount | uint256 | The amount in asset to bid. |

### bidPools

```solidity
function bidPools(uint256, address) external view returns (uint256 amount, uint256 timestamp)
```

Pools &amp; order books information.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |
| _1 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |
| timestamp | uint256 | undefined |

### executeBids

```solidity
function executeBids(uint256 collateralAmountToLiquidate) external nonpayable returns (uint256 totalAmountExecuted, uint256 totalCollateralLiquidated)
```

Execute the liquidation call by executing the bids placed in the pools in ASC order.

*Should only be called from Mixologist.      Mixologist should send the `collateralAmountToLiquidate` to this contract before calling this function. Tx will fail if it can&#39;t transfer allowed BeachBar asset from Mixologist.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| collateralAmountToLiquidate | uint256 | The amount of collateral to liquidate. |

#### Returns

| Name | Type | Description |
|---|---|---|
| totalAmountExecuted | uint256 | The amount of asset that was executed. |
| totalCollateralLiquidated | uint256 | The amount of collateral that was liquidated. |

### getNextAvailBidPool

```solidity
function getNextAvailBidPool() external view returns (uint256 i, bool available)
```

Get the next not empty bid pool in ASC order.




#### Returns

| Name | Type | Description |
|---|---|---|
| i | uint256 | The bid pool id. |
| available | bool | True if there is at least 1 bid available across all the order books. |

### getOrderBookPoolEntries

```solidity
function getOrderBookPoolEntries(uint256 pool) external view returns (struct OrderBookPoolEntry[] x)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pool | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| x | OrderBookPoolEntry[] | undefined |

### getOrderBookSize

```solidity
function getOrderBookSize(uint256 pool) external view returns (uint256 size)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pool | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| size | uint256 | undefined |

### init

```solidity
function init(LiquidationQueueMeta _liquidationQueueMeta) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _liquidationQueueMeta | LiquidationQueueMeta | undefined |

### liquidatedAssetId

```solidity
function liquidatedAssetId() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### lqAssetId

```solidity
function lqAssetId() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### market

```solidity
function market() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### marketAssetId

```solidity
function marketAssetId() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### orderBookEntries

```solidity
function orderBookEntries(uint256, uint256) external view returns (address bidder, struct Bidder bidInfo)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |
| _1 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| bidder | address | undefined |
| bidInfo | Bidder | undefined |

### orderBookInfos

```solidity
function orderBookInfos(uint256) external view returns (uint32 poolId, uint32 nextBidPull, uint32 nextBidPush)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| poolId | uint32 | undefined |
| nextBidPull | uint32 | undefined |
| nextBidPush | uint32 | undefined |

### redeem

```solidity
function redeem(address to) external nonpayable
```

Redeem a balance.

*`msg.sender` is used as the redeemer.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | The address to redeem to. |

### removeBid

```solidity
function removeBid(address user, uint256 pool, uint256 bidPosition) external nonpayable returns (uint256 amountRemoved)
```

Remove an activated bid from a given pool.

*Clean the userBidIndex here instead of the `executeBids()` function to save on gas.      To prevent DoS attacks on `executeBids()` and gas costs, the last activated bid      will take the position of the removed bid.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to send the funds to. |
| pool | uint256 | The target pool. |
| bidPosition | uint256 | The position of the bid index inside the `userBidIndexes[msg.sender][pool]`. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountRemoved | uint256 | The amount of the bid removed. |

### removeInactivatedBid

```solidity
function removeInactivatedBid(address user, uint256 pool) external nonpayable returns (uint256 amountRemoved)
```

Remove a not yet activated bid from the bid pool.

*Remove `msg.sender` funds.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to send the funds to. |
| pool | uint256 | The pool to remove the bid from. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountRemoved | uint256 | The amount of the bid. |

### userBidIndexLength

```solidity
function userBidIndexLength(address user, uint256 pool) external view returns (uint256 len)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |
| pool | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| len | uint256 | undefined |

### userBidIndexes

```solidity
function userBidIndexes(address, uint256, uint256) external view returns (uint256)
```

Ledger.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | uint256 | undefined |
| _2 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |



## Events

### ActivateBid

```solidity
event ActivateBid(address indexed caller, address indexed bidder, uint256 indexed pool, uint256 amount, uint256 timestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller `indexed` | address | undefined |
| bidder `indexed` | address | undefined |
| pool `indexed` | uint256 | undefined |
| amount  | uint256 | undefined |
| timestamp  | uint256 | undefined |

### Bid

```solidity
event Bid(address indexed caller, address indexed bidder, uint256 indexed pool, uint256 amount, uint256 timestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller `indexed` | address | undefined |
| bidder `indexed` | address | undefined |
| pool `indexed` | uint256 | undefined |
| amount  | uint256 | undefined |
| timestamp  | uint256 | undefined |

### ExecuteBids

```solidity
event ExecuteBids(address indexed caller, uint256 indexed pool, uint256 amountExecuted, uint256 collateralLiquidated, uint256 timestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller `indexed` | address | undefined |
| pool `indexed` | uint256 | undefined |
| amountExecuted  | uint256 | undefined |
| collateralLiquidated  | uint256 | undefined |
| timestamp  | uint256 | undefined |

### Redeem

```solidity
event Redeem(address indexed redeemer, address indexed to, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| redeemer `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |

### RemoveBid

```solidity
event RemoveBid(address indexed caller, address indexed bidder, uint256 indexed pool, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller `indexed` | address | undefined |
| bidder `indexed` | address | undefined |
| pool `indexed` | uint256 | undefined |
| amount  | uint256 | undefined |



