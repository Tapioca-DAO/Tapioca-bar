# IStrategy









## Methods

### cheapWithdrawable

```solidity
function cheapWithdrawable() external view returns (uint256 amount)
```

Returns the maximum amount that can be withdrawn for a low gas fee When more than this amount is withdrawn it will trigger divesting from the actual strategy which will incur higher gas costs




#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### contractAddress

```solidity
function contractAddress() external view returns (address contractAddress_)
```

Returns the contract address that this strategy works with




#### Returns

| Name | Type | Description |
|---|---|---|
| contractAddress_ | address | undefined |

### currentBalance

```solidity
function currentBalance() external view returns (uint256 amount)
```

Returns the total value the strategy holds (principle + gain) expressed in asset token amount. This should be cheap in gas to retrieve. Can return a bit less than the actual, but shouldn&#39;t return more. The gas cost of this function will be paid on any deposit or withdrawal onto and out of the YieldBox that uses this strategy. Also, anytime a protocol converts between shares and amount, this gets called.




#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### deposited

```solidity
function deposited(uint256 amount) external nonpayable
```

Is called by YieldBox to signal funds have been added, the strategy may choose to act on this When a large enough deposit is made, this should trigger the strategy to invest into the actual strategy. This function should normally NOT be used to invest on each call as that would be costly for small deposits. If the strategy handles native tokens (ETH) it will receive it directly (not wrapped). It will be up to the strategy to wrap it if needed. Only accept this call from the YieldBox



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### description

```solidity
function description() external view returns (string description_)
```

Returns a description for this strategy




#### Returns

| Name | Type | Description |
|---|---|---|
| description_ | string | undefined |

### name

```solidity
function name() external view returns (string name_)
```

Returns a name for this strategy




#### Returns

| Name | Type | Description |
|---|---|---|
| name_ | string | undefined |

### tokenId

```solidity
function tokenId() external view returns (uint256 tokenId_)
```

Returns the tokenId that this strategy works with (for EIP1155) This is always 0 for EIP20 tokens




#### Returns

| Name | Type | Description |
|---|---|---|
| tokenId_ | uint256 | undefined |

### tokenType

```solidity
function tokenType() external view returns (enum TokenType tokenType_)
```

Returns the standard that this strategy works with




#### Returns

| Name | Type | Description |
|---|---|---|
| tokenType_ | enum TokenType | undefined |

### withdraw

```solidity
function withdraw(address to, uint256 amount) external nonpayable
```

Is called by the YieldBox to ask the strategy to withdraw to the user When a strategy keeps a little reserve for cheap withdrawals and the requested withdrawal goes over this amount, the strategy should divest enough from the strategy to complete the withdrawal and rebalance the reserve. If the strategy handles native tokens (ETH) it should send this, not a wrapped version. Only accept this call from the YieldBox



#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| amount | uint256 | undefined |

### withdrawable

```solidity
function withdrawable() external view returns (uint256 amount)
```

Returns the maximum amount that can be withdrawn




#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### yieldBox

```solidity
function yieldBox() external view returns (contract IYieldBox yieldBox_)
```

Returns the address of the yieldBox that this strategy is for




#### Returns

| Name | Type | Description |
|---|---|---|
| yieldBox_ | contract IYieldBox | undefined |




