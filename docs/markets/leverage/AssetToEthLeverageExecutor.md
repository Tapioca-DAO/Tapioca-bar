# AssetToEthLeverageExecutor









## Methods

### buildSwapDefaultData

```solidity
function buildSwapDefaultData(address tokenIn, address tokenOut, uint256 amountIn) external view returns (bytes)
```

returns getCollateral or getAsset for Asset &gt; DAI or DAI &gt; Asset respectively default data parameter



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenIn | address | token in address |
| tokenOut | address | token out address |
| amountIn | uint256 | amount to get the minimum for |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes | undefined |

### claimOwnership

```solidity
function claimOwnership() external nonpayable
```

Needs to be called by `pendingOwner` to claim ownership.




### cluster

```solidity
function cluster() external view returns (contract ICluster)
```

returns ICluster address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICluster | undefined |

### getAsset

```solidity
function getAsset(uint256 assetId, address collateralAddress, address assetAddress, uint256 collateralAmountIn, address from, bytes data) external nonpayable returns (uint256 assetAmountOut)
```

buys asset with collateral

*unwrap tETH &gt; ETH &gt; USDO*

#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | Asset&#39;s YieldBox id; usually USDO asset id |
| collateralAddress | address | tETH address (TOFT ETH) |
| assetAddress | address | usually USDO address |
| collateralAmountIn | uint256 | amount to swap |
| from | address | collateral receiver |
| data | bytes | AssetToEthLeverageExecutor data |

#### Returns

| Name | Type | Description |
|---|---|---|
| assetAmountOut | uint256 | undefined |

### getCollateral

```solidity
function getCollateral(uint256 collateralId, address assetAddress, address collateralAddress, uint256 assetAmountIn, address from, bytes data) external nonpayable returns (uint256 collateralAmountOut)
```

buys collateral with asset

*USDO &gt; ETH &gt; wrap to tETH*

#### Parameters

| Name | Type | Description |
|---|---|---|
| collateralId | uint256 | Collateral&#39;s YieldBox id |
| assetAddress | address | usually USDO address |
| collateralAddress | address | tETH address (TOFT ETH) |
| assetAmountIn | uint256 | amount to swap |
| from | address | collateral receiver |
| data | bytes | AssetToEthLeverageExecutor data |

#### Returns

| Name | Type | Description |
|---|---|---|
| collateralAmountOut | uint256 | undefined |

### owner

```solidity
function owner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### pendingOwner

```solidity
function pendingOwner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### setCluster

```solidity
function setCluster(contract ICluster _cluster) external nonpayable
```

sets cluster



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cluster | contract ICluster | the new ICluster |

### setSwapper

```solidity
function setSwapper(contract ISwapper _swapper) external nonpayable
```

sets swapper



#### Parameters

| Name | Type | Description |
|---|---|---|
| _swapper | contract ISwapper | the new ISwapper |

### swapper

```solidity
function swapper() external view returns (contract ISwapper)
```

returns ISwapper address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISwapper | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner, bool direct, bool renounce) external nonpayable
```

Transfers ownership to `newOwner`. Either directly or claimable by the new pending owner. Can only be invoked by the current `owner`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | Address of the new owner. |
| direct | bool | True if `newOwner` should be set immediately. False if `newOwner` needs to use `claimOwnership`. |
| renounce | bool | Allows the `newOwner` to be `address(0)` if `direct` and `renounce` is True. Has no effect otherwise. |

### yieldBox

```solidity
function yieldBox() external view returns (contract YieldBox)
```

returns YieldBox address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract YieldBox | undefined |



## Events

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |



