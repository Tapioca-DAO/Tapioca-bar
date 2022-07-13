# Mixologist









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
function accrueInfo() external view returns (uint64 interestPerSecond, uint64 lastAccrued, uint128 feesEarnedFraction)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| interestPerSecond | uint64 | undefined |
| lastAccrued | uint64 | undefined |
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

### assetId

```solidity
function assetId() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

### collateralId

```solidity
function collateralId() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### computeAssetAmountToSolvency

```solidity
function computeAssetAmountToSolvency(address user, uint256 _exchangeRate) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |
| _exchangeRate | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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
function depositFeesToYieldBox(contract MultiSwapper swapper) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| swapper | contract MultiSwapper | undefined |

### exchangeRate

```solidity
function exchangeRate() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### flashLoan

```solidity
function flashLoan(contract IFlashBorrower borrower, address receiver, uint256 amount, bytes data) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| borrower | contract IFlashBorrower | undefined |
| receiver | address | undefined |
| amount | uint256 | undefined |
| data | bytes | undefined |

### init

```solidity
function init(bytes data) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| data | bytes | undefined |

### liquidate

```solidity
function liquidate(address[] users, uint256[] maxBorrowParts, contract MultiSwapper swapper) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| users | address[] | undefined |
| maxBorrowParts | uint256[] | undefined |
| swapper | contract MultiSwapper | undefined |

### liquidationQueue

```solidity
function liquidationQueue() external view returns (contract ILiquidationQueue)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ILiquidationQueue | undefined |

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

### setCollateralSwapPath

```solidity
function setCollateralSwapPath(address[] _collateralSwapPath) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _collateralSwapPath | address[] | undefined |

### setLiquidationQueue

```solidity
function setLiquidationQueue(contract ILiquidationQueue _liquidationQueue, LiquidationQueueMeta _liquidationQueueMeta) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _liquidationQueue | contract ILiquidationQueue | undefined |
| _liquidationQueueMeta | LiquidationQueueMeta | undefined |

### setTapSwapPath

```solidity
function setTapSwapPath(address[] _tapSwapPath) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _tapSwapPath | address[] | undefined |

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

### withdrawFeesEarned

```solidity
function withdrawFeesEarned() external nonpayable
```






### yieldBox

```solidity
function yieldBox() external view returns (contract YieldBox)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract YieldBox | undefined |



## Events

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| spender `indexed` | address | undefined |
| value  | uint256 | undefined |

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
event LogBorrow(address indexed from, address indexed to, uint256 amount, uint256 feeAmount, uint256 part)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |
| feeAmount  | uint256 | undefined |
| part  | uint256 | undefined |

### LogExchangeRate

```solidity
event LogExchangeRate(uint256 rate)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| rate  | uint256 | undefined |

### LogFlashLoan

```solidity
event LogFlashLoan(address indexed borrower, uint256 amount, uint256 feeAmount, address indexed receiver)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| borrower `indexed` | address | undefined |
| amount  | uint256 | undefined |
| feeAmount  | uint256 | undefined |
| receiver `indexed` | address | undefined |

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

### LogYieldBoxFeesDeposit

```solidity
event LogYieldBoxFeesDeposit(uint256 feeShares, uint256 tapAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| feeShares  | uint256 | undefined |
| tapAmount  | uint256 | undefined |

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
event Transfer(address indexed from, address indexed to, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| value  | uint256 | undefined |



