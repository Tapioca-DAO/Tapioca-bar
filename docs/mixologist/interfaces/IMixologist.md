# IMixologist









## Methods

### DOMAIN_SEPARATOR

```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### accrue

```solidity
function accrue() external nonpayable
```






### accrueInfo

```solidity
function accrueInfo() external view returns (uint64 interestPerSecond, uint64 lastBlockAccrued, uint128 feesEarnedFraction)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| interestPerSecond | uint64 | undefined |
| lastBlockAccrued | uint64 | undefined |
| feesEarnedFraction | uint128 | undefined |

### addAsset

```solidity
function addAsset(address to, bool skim, uint256 share) external nonpayable returns (uint256 fraction)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| skim | bool | undefined |
| share | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| fraction | uint256 | undefined |

### addCollateral

```solidity
function addCollateral(address to, bool skim, uint256 share) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| skim | bool | undefined |
| share | uint256 | undefined |

### allowance

```solidity
function allowance(address, address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### approve

```solidity
function approve(address spender, uint256 amount) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### asset

```solidity
function asset() external view returns (contract IERC20)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

### balanceOf

```solidity
function balanceOf(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### beachBar

```solidity
function beachBar() external view returns (contract BeachBar)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract BeachBar | undefined |

### borrow

```solidity
function borrow(address to, uint256 amount) external nonpayable returns (uint256 part, uint256 share)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| part | uint256 | undefined |
| share | uint256 | undefined |

### claimOwnership

```solidity
function claimOwnership() external nonpayable
```






### collateral

```solidity
function collateral() external view returns (contract IERC20)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

### cook

```solidity
function cook(uint8[] actions, uint256[] values, bytes[] datas) external payable returns (uint256 value1, uint256 value2)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| actions | uint8[] | undefined |
| values | uint256[] | undefined |
| datas | bytes[] | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| value1 | uint256 | undefined |
| value2 | uint256 | undefined |

### decimals

```solidity
function decimals() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined |

### depositFeesToYieldBox

```solidity
function depositFeesToYieldBox(contract MultiSwapper) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | contract MultiSwapper | undefined |

### exchangeRate

```solidity
function exchangeRate() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### feeTo

```solidity
function feeTo() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### getInitData

```solidity
function getInitData(contract IERC20 collateral_, contract IERC20 asset_, contract IOracle oracle_, bytes oracleData_) external pure returns (bytes data)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| collateral_ | contract IERC20 | undefined |
| asset_ | contract IERC20 | undefined |
| oracle_ | contract IOracle | undefined |
| oracleData_ | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| data | bytes | undefined |

### init

```solidity
function init(bytes data) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| data | bytes | undefined |

### isSolvent

```solidity
function isSolvent(address user, bool open) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |
| open | bool | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### liquidate

```solidity
function liquidate(address[] users, uint256[] borrowParts, address to, contract MultiSwapper swapper, bool open) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| users | address[] | undefined |
| borrowParts | uint256[] | undefined |
| to | address | undefined |
| swapper | contract MultiSwapper | undefined |
| open | bool | undefined |

### masterContract

```solidity
function masterContract() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### name

```solidity
function name() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### nonces

```solidity
function nonces(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### oracle

```solidity
function oracle() external view returns (contract IOracle)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IOracle | undefined |

### oracleData

```solidity
function oracleData() external view returns (bytes)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes | undefined |

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

### permit

```solidity
function permit(address owner_, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner_ | address | undefined |
| spender | address | undefined |
| value | uint256 | undefined |
| deadline | uint256 | undefined |
| v | uint8 | undefined |
| r | bytes32 | undefined |
| s | bytes32 | undefined |

### removeAsset

```solidity
function removeAsset(address to, uint256 fraction) external nonpayable returns (uint256 share)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| fraction | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| share | uint256 | undefined |

### removeCollateral

```solidity
function removeCollateral(address to, uint256 share) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| share | uint256 | undefined |

### repay

```solidity
function repay(address to, bool skim, uint256 part) external nonpayable returns (uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| skim | bool | undefined |
| part | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### setFeeTo

```solidity
function setFeeTo(address newFeeTo) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newFeeTo | address | undefined |

### setSwapper

```solidity
function setSwapper(contract MultiSwapper swapper, bool enable) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| swapper | contract MultiSwapper | undefined |
| enable | bool | undefined |

### swappers

```solidity
function swappers(contract MultiSwapper) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | contract MultiSwapper | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### symbol

```solidity
function symbol() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### totalAsset

```solidity
function totalAsset() external view returns (uint128 elastic, uint128 base)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| elastic | uint128 | undefined |
| base | uint128 | undefined |

### totalBorrow

```solidity
function totalBorrow() external view returns (uint128 elastic, uint128 base)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| elastic | uint128 | undefined |
| base | uint128 | undefined |

### totalCollateralShare

```solidity
function totalCollateralShare() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transfer

```solidity
function transfer(address to, uint256 amount) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 amount) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner, bool direct, bool renounce) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |
| direct | bool | undefined |
| renounce | bool | undefined |

### updateExchangeRate

```solidity
function updateExchangeRate() external nonpayable returns (bool updated, uint256 rate)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| updated | bool | undefined |
| rate | uint256 | undefined |

### userBorrowPart

```solidity
function userBorrowPart(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### userCollateralShare

```solidity
function userCollateralShare(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### withdrawFees

```solidity
function withdrawFees() external nonpayable
```








## Events

### Approval

```solidity
event Approval(address indexed _owner, address indexed _spender, uint256 _value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _owner `indexed` | address | undefined |
| _spender `indexed` | address | undefined |
| _value  | uint256 | undefined |

### LogAccrue

```solidity
event LogAccrue(uint256 accruedAmount, uint256 feeFraction, uint64 rate, uint256 utilization)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| accruedAmount  | uint256 | undefined |
| feeFraction  | uint256 | undefined |
| rate  | uint64 | undefined |
| utilization  | uint256 | undefined |

### LogAddAsset

```solidity
event LogAddAsset(address indexed from, address indexed to, uint256 share, uint256 fraction)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share  | uint256 | undefined |
| fraction  | uint256 | undefined |

### LogAddCollateral

```solidity
event LogAddCollateral(address indexed from, address indexed to, uint256 share)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share  | uint256 | undefined |

### LogBorrow

```solidity
event LogBorrow(address indexed from, address indexed to, uint256 amount, uint256 part)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |
| part  | uint256 | undefined |

### LogExchangeRate

```solidity
event LogExchangeRate(uint256 rate)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| rate  | uint256 | undefined |

### LogFeeTo

```solidity
event LogFeeTo(address indexed newFeeTo)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newFeeTo `indexed` | address | undefined |

### LogRemoveAsset

```solidity
event LogRemoveAsset(address indexed from, address indexed to, uint256 share, uint256 fraction)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share  | uint256 | undefined |
| fraction  | uint256 | undefined |

### LogRemoveCollateral

```solidity
event LogRemoveCollateral(address indexed from, address indexed to, uint256 share)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share  | uint256 | undefined |

### LogRepay

```solidity
event LogRepay(address indexed from, address indexed to, uint256 amount, uint256 part)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |
| part  | uint256 | undefined |

### LogWithdrawFees

```solidity
event LogWithdrawFees(address indexed feeTo, uint256 feesEarnedFraction)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| feeTo `indexed` | address | undefined |
| feesEarnedFraction  | uint256 | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### Transfer

```solidity
event Transfer(address indexed _from, address indexed _to, uint256 _value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _from `indexed` | address | undefined |
| _to `indexed` | address | undefined |
| _value  | uint256 | undefined |



