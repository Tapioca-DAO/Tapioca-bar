# BBBorrow









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

### accrue

```solidity
function accrue() external nonpayable
```

Accrues the interest on the borrowed tokens and handles the accumulation of fees.




### accrueInfo

```solidity
function accrueInfo() external view returns (uint64 debtRate, uint64 lastAccrued)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| debtRate | uint64 | undefined |
| lastAccrued | uint64 | undefined |

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

### assetOracle

```solidity
function assetOracle() external view returns (contract IOracle)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IOracle | undefined |

### assetOracleData

```solidity
function assetOracleData() external view returns (bytes)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes | undefined |

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

### borrow

```solidity
function borrow(address from, address to, uint256 amount) external nonpayable returns (uint256 part, uint256 share)
```

Sender borrows `amount` and transfers it to `to`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Account to borrow for. |
| to | address | The receiver of borrowed tokens. |
| amount | uint256 | Amount to borrow. |

#### Returns

| Name | Type | Description |
|---|---|---|
| part | uint256 | Total part of the debt held by borrowers. |
| share | uint256 | Total amount in shares borrowed. |

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

### debtRateAgainstEthMarket

```solidity
function debtRateAgainstEthMarket() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### debtStartPoint

```solidity
function debtStartPoint() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### exchangeRate

```solidity
function exchangeRate() external view returns (uint256)
```

Exchange and interest rate tracking. This is &#39;cached&#39; here because calls to Oracles can be very expensive. Asset -&gt; collateral = assetAmount * exchangeRate.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getDebtRate

```solidity
function getDebtRate() external view returns (uint256)
```

returns the current debt rate




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getTotalDebt

```solidity
function getTotalDebt() external view returns (uint256)
```

returns total market debt




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### isMainMarket

```solidity
function isMainMarket() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### leverageExecutor

```solidity
function leverageExecutor() external view returns (contract ILeverageExecutor)
```

returns the leverage executor




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ILeverageExecutor | undefined |

### liquidationBonusAmount

```solidity
function liquidationBonusAmount() external view returns (uint256)
```

max liquidatable bonus amount




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### liquidationCollateralizationRate

```solidity
function liquidationCollateralizationRate() external view returns (uint256)
```

liquidation collateralization rate




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

### maxDebtRate

```solidity
function maxDebtRate() external view returns (uint256)
```






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

### maxMintFee

```solidity
function maxMintFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### maxMintFeeStart

```solidity
function maxMintFeeStart() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### minDebtRate

```solidity
function minDebtRate() external view returns (uint256)
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

### minMintFee

```solidity
function minMintFee() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### minMintFeeStart

```solidity
function minMintFeeStart() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

### openingFees

```solidity
function openingFees(address user) external view returns (uint256 fee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| fee | uint256 | undefined |

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

### permitAction

```solidity
function permitAction(bytes data, uint16 actionType) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| data | bytes | undefined |
| actionType | uint16 | undefined |

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

accrual protocol rewards




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### rateTimestamp

```solidity
function rateTimestamp() external view returns (uint256)
```

latest timestamp when `exchangeRate` was updated




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### rateValidDuration

```solidity
function rateValidDuration() external view returns (uint256)
```

cached rate is valid only for the `rateValidDuration` time




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### repay

```solidity
function repay(address from, address to, bool, uint256 part) external nonpayable returns (uint256 amount)
```

Repays a loan.

*The bool param is not used but we added it to respect the ISingularity interface for MarketsHelper compatibility*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Address to repay from. |
| to | address | Address of the user this payment should go. |
| _2 | bool | undefined |
| part | uint256 | The amount to repay. See `userBorrowPart`. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | The total amount repayed. |

### setLeverageExecutor

```solidity
function setLeverageExecutor(contract ILeverageExecutor _executor) external nonpayable
```

updates `leverageExecutor`



#### Parameters

| Name | Type | Description |
|---|---|---|
| _executor | contract ILeverageExecutor | the new ILeverageExecutor |

### setMarketConfig

```solidity
function setMarketConfig(contract IOracle _oracle, bytes _oracleData, address _conservator, uint256 _callerFee, uint256 _protocolFee, uint256 _liquidationBonusAmount, uint256 _minLiquidatorReward, uint256 _maxLiquidatorReward, uint256 _totalBorrowCap, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate) external nonpayable
```

sets common market configuration

*values are updated only if &gt; 0 or not address(0)*

#### Parameters

| Name | Type | Description |
|---|---|---|
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
| _liquidationCollateralizationRate | uint256 | undefined |

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

### AssetOracleDataUpdated

```solidity
event AssetOracleDataUpdated()
```

event emitted when the asset&#39;s Oracle data is updated




### AssetOracleUpdated

```solidity
event AssetOracleUpdated(address indexed oldVal, address indexed newVal)
```

event emitted when the asset&#39;s Oracle is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | address | undefined |
| newVal `indexed` | address | undefined |

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

### DebtRateAgainstEthUpdated

```solidity
event DebtRateAgainstEthUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the debt rate against the main market is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### ExchangeRateDurationUpdated

```solidity
event ExchangeRateDurationUpdated(uint256 _oldVal, uint256 _newVal)
```

event emitted when `exchangeRate` validation duration is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _oldVal  | uint256 | undefined |
| _newVal  | uint256 | undefined |

### LeverageExecutorSet

```solidity
event LeverageExecutorSet(address indexed oldVal, address indexed newVal)
```

event emitted when `leverageExecutor` is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | address | undefined |
| newVal `indexed` | address | undefined |

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
event LogAccrue(uint256 indexed accruedAmount, uint64 indexed rate)
```

event emitted when accrue is called



#### Parameters

| Name | Type | Description |
|---|---|---|
| accruedAmount `indexed` | uint256 | undefined |
| rate `indexed` | uint64 | undefined |

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

event emitted when borrow is performed



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

### LogExchangeRate

```solidity
event LogExchangeRate(uint256 indexed rate)
```

event emitted when cached exchange rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| rate `indexed` | uint256 | undefined |

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

event emitted when a repay operation is performed



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount `indexed` | uint256 | undefined |
| part  | uint256 | undefined |

### MaxDebtRateUpdated

```solidity
event MaxDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the maximum debt rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal `indexed` | uint256 | undefined |
| newVal `indexed` | uint256 | undefined |

### MinDebtRateUpdated

```solidity
event MinDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal)
```

event emitted when the minimum debt rate is updated



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

### UpdateMinMaxMintFee

```solidity
event UpdateMinMaxMintFee(uint256 indexed oldMin, uint256 indexed newMin, uint256 indexed oldMax, uint256 newMax)
```

event emitted when min and max mint fees are updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldMin `indexed` | uint256 | undefined |
| newMin `indexed` | uint256 | undefined |
| oldMax `indexed` | uint256 | undefined |
| newMax  | uint256 | undefined |

### UpdateMinMaxMintRange

```solidity
event UpdateMinMaxMintRange(uint256 indexed oldMin, uint256 indexed newMin, uint256 indexed oldMax, uint256 newMax)
```

event emitted when min and max mint range values are updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldMin `indexed` | uint256 | undefined |
| newMin `indexed` | uint256 | undefined |
| oldMax `indexed` | uint256 | undefined |
| newMax  | uint256 | undefined |


