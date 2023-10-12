# MarketLiquidatorReceiver









## Methods

### allowances

```solidity
function allowances(address sender, address tokenIn) external view returns (uint256 allowance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined |
| tokenIn | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| allowance | uint256 | undefined |

### assignOracle

```solidity
function assignOracle(address _tokenIn, address _oracle, bytes _data, uint256 _precision) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _tokenIn | address | undefined |
| _oracle | address | undefined |
| _data | bytes | undefined |
| _precision | uint256 | undefined |

### assignSwapper

```solidity
function assignSwapper(address _tokenIn, address _swapper) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _tokenIn | address | undefined |
| _swapper | address | undefined |

### claimOwnership

```solidity
function claimOwnership() external nonpayable
```

Needs to be called by `pendingOwner` to claim ownership.




### decreaseAllowance

```solidity
function decreaseAllowance(address sender, address tokenIn, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined |
| tokenIn | address | undefined |
| amount | uint256 | undefined |

### increaseAllowance

```solidity
function increaseAllowance(address sender, address tokenIn, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined |
| tokenIn | address | undefined |
| amount | uint256 | undefined |

### onCollateralReceiver

```solidity
function onCollateralReceiver(address initiator, address tokenIn, address tokenOut, uint256 collateralAmount, bytes data) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| initiator | address | undefined |
| tokenIn | address | undefined |
| tokenOut | address | undefined |
| collateralAmount | uint256 | undefined |
| data | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### oracles

```solidity
function oracles(address tokenIn) external view returns (bytes data, address target, uint256 precision)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenIn | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| data | bytes | undefined |
| target | address | undefined |
| precision | uint256 | undefined |

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

### swappers

```solidity
function swappers(address tokenIn) external view returns (address swapper)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenIn | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| swapper | address | undefined |

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



## Events

### OracleAssigned

```solidity
event OracleAssigned(address indexed tokenIn, address indexed oracle)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenIn `indexed` | address | undefined |
| oracle `indexed` | address | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### SwapperAssigned

```solidity
event SwapperAssigned(address indexed tokenIn, address indexed swapper)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenIn `indexed` | address | undefined |
| swapper `indexed` | address | undefined |



