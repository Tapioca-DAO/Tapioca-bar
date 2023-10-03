# SGLStorage









## Methods

### DOMAIN_SEPARATOR

```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32)
```



*See {IERC20Permit-DOMAIN_SEPARATOR}.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### accrueInfo

```solidity
function accrueInfo() external view returns (uint64 interestPerSecond, uint64 lastAccrued, uint128 feesEarnedFraction)
```

information about the accrual info




#### Returns

| Name | Type | Description |
|---|---|---|
| interestPerSecond | uint64 | undefined |
| lastAccrued | uint64 | undefined |
| feesEarnedFraction | uint128 | undefined |

### allowance

```solidity
function allowance(address, address) external view returns (uint256)
```

owner &gt; spender &gt; allowance mapping.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### allowanceBorrow

```solidity
function allowanceBorrow(address, address) external view returns (uint256)
```

owner &gt; spender &gt; allowance mapping.



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

Approves `amount` from sender to be spend by `spender`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | Address of the party that can draw from msg.sender&#39;s account. |
| amount | uint256 | The maximum collective amount that `spender` can draw. |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | (bool) Returns True if approved. |

### approveBorrow

```solidity
function approveBorrow(address spender, uint256 amount) external nonpayable returns (bool)
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

asset token address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

### assetId

```solidity
function assetId() external view returns (uint256)
```

asset token YieldBox id




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### balanceOf

```solidity
function balanceOf(address) external view returns (uint256)
```

owner &gt; balance mapping.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### borrowOpeningFee

```solidity
function borrowOpeningFee() external view returns (uint256)
```

borrowing opening fee




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### callerFee

```solidity
function callerFee() external view returns (uint256)
```

liquidation caller rewards




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### claimOwnership

```solidity
function claimOwnership() external nonpayable
```

Needs to be called by `pendingOwner` to claim ownership.




### collateral

```solidity
function collateral() external view returns (contract IERC20)
```

collateral token address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

### collateralId

```solidity
function collateralId() external view returns (uint256)
```

collateral token YieldBox id




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### collateralizationRate

```solidity
function collateralizationRate() external view returns (uint256)
```

collateralization rate




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### computeClosingFactor

```solidity
function computeClosingFactor(uint256 borrowPart, uint256 collateralPartInAsset, uint256 ratesPrecision) external view returns (uint256)
```

returns the maximum liquidatable amount for user



#### Parameters

| Name | Type | Description |
|---|---|---|
| borrowPart | uint256 | undefined |
| collateralPartInAsset | uint256 | undefined |
| ratesPrecision | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### computeLiquidatorReward

```solidity
function computeLiquidatorReward(address user, uint256 _exchangeRate) external view returns (uint256)
```

computes the possible liquidator rewarduser the user for which a liquidation operation should be performed



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |
| _exchangeRate | uint256 | the exchange rate asset/collateral to use for internal computations |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### computeTVLInfo

```solidity
function computeTVLInfo(address user, uint256 _exchangeRate) external view returns (uint256 amountToSolvency, uint256 minTVL, uint256 maxTVL)
```

return the amount of collateral for a `user` to be solvent, min TVL and max TVL. Returns 0 if user already solvent.

*we use a `CLOSED_COLLATERIZATION_RATE` that is a safety buffer when making the user solvent again,      to prevent from being liquidated. This function is valid only if user is not solvent by `_isSolvent()`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to check solvency. |
| _exchangeRate | uint256 | the exchange rate asset/collateral. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountToSolvency | uint256 | the amount of collateral to be solvent. |
| minTVL | uint256 | undefined |
| maxTVL | uint256 | undefined |

### conservator

```solidity
function conservator() external view returns (address)
```

conservator&#39;s addresss




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### decimals

```solidity
function decimals() external view returns (uint8)
```

returns market&#39;s ERC20 decimals




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined |

### exchangeRate

```solidity
function exchangeRate() external view returns (uint256)
```

Exchange and interest rate tracking. This is &#39;cached&#39; here because calls to Oracles can be very expensive. Asset -&gt; collateral = assetAmount * exchangeRate.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### fullUtilizationMinusMax

```solidity
function fullUtilizationMinusMax() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### interestElasticity

```solidity
function interestElasticity() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### liquidationBonusAmount

```solidity
function liquidationBonusAmount() external view returns (uint256)
```

max liquidatable bonus amount




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### liquidationMultiplier

```solidity
function liquidationMultiplier() external view returns (uint256)
```

liquidation multiplier used to compute liquidator rewards




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### liquidationQueue

```solidity
function liquidationQueue() external view returns (contract ILiquidationQueue)
```

liquidation queue address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ILiquidationQueue | undefined |

### lqCollateralizationRate

```solidity
function lqCollateralizationRate() external view returns (uint256)
```

collateralization rate




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### maxLiquidatorReward

```solidity
function maxLiquidatorReward() external view returns (uint256)
```

max % a liquidator can receive in rewards




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### maximumInterestPerSecond

```solidity
function maximumInterestPerSecond() external view returns (uint64)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint64 | undefined |

### maximumTargetUtilization

```solidity
function maximumTargetUtilization() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### minLiquidatorReward

```solidity
function minLiquidatorReward() external view returns (uint256)
```

min % a liquidator can receive in rewards




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### minimumInterestPerSecond

```solidity
function minimumInterestPerSecond() external view returns (uint64)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint64 | undefined |

### minimumTargetUtilization

```solidity
function minimumTargetUtilization() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### name

```solidity
function name() external view returns (string)
```

returns market&#39;s ERC20 name




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### nonces

```solidity
function nonces(address owner) external view returns (uint256)
```



*Returns the current nonce for `owner`. This value must be included whenever a signature is generated for {permit}. Every successful call to {permit} increases ``owner``&#39;s nonce by one. This prevents a signature from being used multiple times.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### oracle

```solidity
function oracle() external view returns (contract IOracle)
```

oracle address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IOracle | undefined |

### oracleData

```solidity
function oracleData() external view returns (bytes)
```

oracleData




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

### pauseOptions

```solidity
function pauseOptions(enum Market.PauseType pauseProp) external view returns (bool pauseStatus)
```

pause options



#### Parameters

| Name | Type | Description |
|---|---|---|
| pauseProp | enum Market.PauseType | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| pauseStatus | bool | undefined |

### pendingOwner

```solidity
function pendingOwner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### penrose

```solidity
function penrose() external view returns (contract IPenrose)
```

returns Penrose address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IPenrose | undefined |

### permit

```solidity
function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external nonpayable
```



*See {IERC20Permit-permit}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| spender | address | undefined |
| value | uint256 | undefined |
| deadline | uint256 | undefined |
| v | uint8 | undefined |
| r | bytes32 | undefined |
| s | bytes32 | undefined |

### permitBorrow

```solidity
function permitBorrow(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| spender | address | undefined |
| value | uint256 | undefined |
| deadline | uint256 | undefined |
| v | uint8 | undefined |
| r | bytes32 | undefined |
| s | bytes32 | undefined |

### protocolFee

```solidity
function protocolFee() external view returns (uint256)
```

liquidation protocol rewards




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### setBorrowCap

```solidity
function setBorrowCap(uint256 _cap) external nonpayable
```

sets max borrowable amount

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _cap | uint256 | the new value |

### setBorrowOpeningFee

```solidity
function setBorrowOpeningFee(uint256 _val) external nonpayable
```

sets the borrowing opening fee

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _val | uint256 | the new value |

### setMarketConfig

```solidity
function setMarketConfig(uint256 _borrowOpeningFee, contract IOracle _oracle, bytes _oracleData, address _conservator, uint256 _callerFee, uint256 _protocolFee, uint256 _liquidationBonusAmount, uint256 _minLiquidatorReward, uint256 _maxLiquidatorReward, uint256 _totalBorrowCap, uint256 _collateralizationRate) external nonpayable
```

sets common market configuration

*values are updated only if &gt; 0 or not address(0)*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrowOpeningFee | uint256 | undefined |
| _oracle | contract IOracle | undefined |
| _oracleData | bytes | undefined |
| _conservator | address | undefined |
| _callerFee | uint256 | undefined |
| _protocolFee | uint256 | undefined |
| _liquidationBonusAmount | uint256 | undefined |
| _minLiquidatorReward | uint256 | undefined |
| _maxLiquidatorReward | uint256 | undefined |
| _totalBorrowCap | uint256 | undefined |
| _collateralizationRate | uint256 | undefined |

### startingInterestPerSecond

```solidity
function startingInterestPerSecond() external view returns (uint64)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint64 | undefined |

### symbol

```solidity
function symbol() external view returns (string)
```

returns market&#39;s ERC20 symbol




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### totalAsset

```solidity
function totalAsset() external view returns (uint128 elastic, uint128 base)
```

total assets share &amp; amount




#### Returns

| Name | Type | Description |
|---|---|---|
| elastic | uint128 | undefined |
| base | uint128 | undefined |

### totalBorrow

```solidity
function totalBorrow() external view returns (uint128 elastic, uint128 base)
```

total amount borrowed




#### Returns

| Name | Type | Description |
|---|---|---|
| elastic | uint128 | undefined |
| base | uint128 | undefined |

### totalBorrowCap

```solidity
function totalBorrowCap() external view returns (uint256)
```

max borrow cap




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### totalCollateralShare

```solidity
function totalCollateralShare() external view returns (uint256)
```

total collateral supplied




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

returns market&#39;s ERC20 totalSupply

*totalSupply for ERC20 compatibility      BalanceOf[user] represent a fraction*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transfer

```solidity
function transfer(address to, uint256 amount) external nonpayable returns (bool)
```

Transfers `amount` tokens from `msg.sender` to `to`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | The address to move the tokens. |
| amount | uint256 | of the tokens to move. |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | (bool) Returns True if succeeded. |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 amount) external nonpayable returns (bool)
```

Transfers `amount` tokens from `from` to `to`. Caller needs approval for `from`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Address to draw tokens from. |
| to | address | The address to move the tokens. |
| amount | uint256 | The token amount to move. |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | (bool) Returns True if succeeded. |

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

### updateExchangeRate

```solidity
function updateExchangeRate() external nonpayable returns (bool updated, uint256 rate)
```

Gets the exchange rate. I.e how much collateral to buy 1e18 asset.

*This function is supposed to be invoked if needed because Oracle queries can be expensive.      Oracle should consider USDO at 1$*


#### Returns

| Name | Type | Description |
|---|---|---|
| updated | bool | True if `exchangeRate` was updated. |
| rate | uint256 | The new exchange rate. |

### updatePause

```solidity
function updatePause(enum Market.PauseType _type, bool val) external nonpayable
```

updates the pause state of the contract

*can only be called by the conservator*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _type | enum Market.PauseType | undefined |
| val | bool | the new value |

### userBorrowPart

```solidity
function userBorrowPart(address) external view returns (uint256)
```

borrow amount per user



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

collateral share per user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

### ApprovalBorrow

```solidity
event ApprovalBorrow(address indexed owner, address indexed spender, uint256 indexed value)
```

event emitted when borrow approval is performed



#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| spender `indexed` | address | undefined |
| value `indexed` | uint256 | undefined |

### BidExecutionSwapperUpdated

```solidity
event BidExecutionSwapperUpdated(address indexed newAddress)
```

event emitted when the bid execution swapper is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### ConservatorUpdated

```solidity
event ConservatorUpdated(address indexed old, address indexed _new)
```

event emitted when conservator is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| old `indexed` | address | undefined |
| _new `indexed` | address | undefined |

### InterestElasticityUpdated

```solidity
event InterestElasticityUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the interest elasticity updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### Liquidated

```solidity
event Liquidated(address indexed liquidator, address[] indexed users, uint256 indexed liquidatorReward, uint256 protocolReward, uint256 repayedAmount, uint256 collateralShareRemoved)
```

event emitted when a position is liquidated



#### Parameters

| Name | Type | Description |
|---|---|---|
| liquidator `indexed` | address | undefined |
| users `indexed` | address[] | undefined |
| liquidatorReward `indexed` | uint256 | undefined |
| protocolReward  | uint256 | undefined |
| repayedAmount  | uint256 | undefined |
| collateralShareRemoved  | uint256 | undefined |

### LiquidationMultiplierUpdated

```solidity
event LiquidationMultiplierUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the liquidation multiplier rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### LogAccrue

```solidity
event LogAccrue(uint256 indexed accruedAmount, uint256 indexed feeFraction, uint64 indexed rate, uint256 utilization)
```

event emitted when accrual happens



#### Parameters

| Name | Type | Description |
|---|---|---|
| accruedAmount `indexed` | uint256 | undefined |
| feeFraction `indexed` | uint256 | undefined |
| rate `indexed` | uint64 | undefined |
| utilization  | uint256 | undefined |

### LogAddAsset

```solidity
event LogAddAsset(address indexed from, address indexed to, uint256 indexed share, uint256 fraction)
```

event emitted when asset is added



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share `indexed` | uint256 | undefined |
| fraction  | uint256 | undefined |

### LogAddCollateral

```solidity
event LogAddCollateral(address indexed from, address indexed to, uint256 indexed share)
```

event emitted when collateral is added



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share `indexed` | uint256 | undefined |

### LogBorrow

```solidity
event LogBorrow(address indexed from, address indexed to, uint256 indexed amount, uint256 feeAmount, uint256 part)
```

event emitted when asset is borrowed



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount `indexed` | uint256 | undefined |
| feeAmount  | uint256 | undefined |
| part  | uint256 | undefined |

### LogBorrowCapUpdated

```solidity
event LogBorrowCapUpdated(uint256 indexed _oldVal, uint256 indexed _newVal)
```

event emitted when borrow cap is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _oldVal `indexed` | uint256 | undefined |
| _newVal `indexed` | uint256 | undefined |

### LogBorrowingFee

```solidity
event LogBorrowingFee(uint256 indexed _oldVal, uint256 indexed _newVal)
```

event emitted when borrow opening fee is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _oldVal `indexed` | uint256 | undefined |
| _newVal `indexed` | uint256 | undefined |

### LogExchangeRate

```solidity
event LogExchangeRate(uint256 indexed rate)
```

event emitted when cached exchange rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| rate `indexed` | uint256 | undefined |

### LogRemoveAsset

```solidity
event LogRemoveAsset(address indexed from, address indexed to, uint256 indexed share, uint256 fraction)
```

event emitted when asset is removed



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share `indexed` | uint256 | undefined |
| fraction  | uint256 | undefined |

### LogRemoveCollateral

```solidity
event LogRemoveCollateral(address indexed from, address indexed to, uint256 indexed share)
```

event emitted when collateral is removed



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| share `indexed` | uint256 | undefined |

### LogRepay

```solidity
event LogRepay(address indexed from, address indexed to, uint256 indexed amount, uint256 part)
```

event emitted when asset is repayed



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount `indexed` | uint256 | undefined |
| part  | uint256 | undefined |

### LogWithdrawFees

```solidity
event LogWithdrawFees(address indexed feeTo, uint256 indexed feesEarnedFraction)
```

event emitted when fees are extracted



#### Parameters

| Name | Type | Description |
|---|---|---|
| feeTo `indexed` | address | undefined |
| feesEarnedFraction `indexed` | uint256 | undefined |

### LogYieldBoxFeesDeposit

```solidity
event LogYieldBoxFeesDeposit(uint256 indexed feeShares, uint256 indexed ethAmount)
```

event emitted when fees are deposited to YieldBox



#### Parameters

| Name | Type | Description |
|---|---|---|
| feeShares `indexed` | uint256 | undefined |
| ethAmount `indexed` | uint256 | undefined |

### LqCollateralizationRateUpdated

```solidity
event LqCollateralizationRateUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the LQ collateralization rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### MaximumInterestPerSecondUpdated

```solidity
event MaximumInterestPerSecondUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the maximum interest per second is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### MaximumTargetUtilizationUpdated

```solidity
event MaximumTargetUtilizationUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the maximum target utilization is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### MinimumInterestPerSecondUpdated

```solidity
event MinimumInterestPerSecondUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the minimum interest per second is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### MinimumTargetUtilizationUpdated

```solidity
event MinimumTargetUtilizationUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the minimum target utilization is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### OracleDataUpdated

```solidity
event OracleDataUpdated()
```

event emitted when oracle data is updated




### OracleUpdated

```solidity
event OracleUpdated()
```

event emitted when oracle is updated




### OrderBookLiquidationMultiplierUpdated

```solidity
event OrderBookLiquidationMultiplierUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the order book liquidation multiplier rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### PausedUpdated

```solidity
event PausedUpdated(enum Market.PauseType indexed _type, bool indexed oldState, bool indexed newState)
```

event emitted when pause state is changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| _type `indexed` | enum Market.PauseType | undefined |
| oldState `indexed` | bool | undefined |
| newState `indexed` | bool | undefined |

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

### UsdoSwapperUpdated

```solidity
event UsdoSwapperUpdated(address indexed newAddress)
```

event emitted when the usdo swapper is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |



