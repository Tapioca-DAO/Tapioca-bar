# UniswapV2Factory









## Methods

### allPairs

```solidity
function allPairs(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### allPairsLength

```solidity
function allPairsLength() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### createPair

```solidity
function createPair(address tokenA, address tokenB) external nonpayable returns (address pair)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenA | address | undefined |
| tokenB | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| pair | address | undefined |

### feeTo

```solidity
function feeTo() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### feeToSetter

```solidity
function feeToSetter() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### getPair

```solidity
function getPair(address, address) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### migrator

```solidity
function migrator() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### pairCodeHash

```solidity
function pairCodeHash() external pure returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### setFeeTo

```solidity
function setFeeTo(address _feeTo) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _feeTo | address | undefined |

### setFeeToSetter

```solidity
function setFeeToSetter(address _feeToSetter) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _feeToSetter | address | undefined |

### setMigrator

```solidity
function setMigrator(address _migrator) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _migrator | address | undefined |



## Events

### PairCreated

```solidity
event PairCreated(address indexed token0, address indexed token1, address pair, uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token0 `indexed` | address | undefined |
| token1 `indexed` | address | undefined |
| pair  | address | undefined |
| _3  | uint256 | undefined |



