# Singularity



> Tapioca market





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
function accrueInfo() external view returns (uint64 interestPerSecond, uint64 lastAccrued, uint128 feesEarnedFraction)
```

information about the accrual info




#### Returns

| Name | Type | Description |
|---|---|---|
| interestPerSecond | uint64 | undefined |
| lastAccrued | uint64 | undefined |
| feesEarnedFraction | uint128 | undefined |

### addAsset

```solidity
function addAsset(address from, address to, bool skim, uint256 share) external nonpayable returns (uint256 fraction)
```

Adds assets to the lending pair.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Address to add asset from. |
| to | address | The address of the user to receive the assets. |
| skim | bool | True if the amount should be skimmed from the deposit balance of msg.sender. False if tokens from msg.sender in `yieldBox` should be transferred. |
| share | uint256 | The amount of shares to add. |

#### Returns

| Name | Type | Description |
|---|---|---|
| fraction | uint256 | Total fractions added. |

### addCollateral

```solidity
function addCollateral(address from, address to, bool skim, uint256 amount, uint256 share) external nonpayable
```

Adds `collateral` from msg.sender to the account `to`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Account to transfer shares from. |
| to | address | The receiver of the tokens. |
| skim | bool | True if the amount should be skimmed from the deposit balance of msg.sender. False if tokens from msg.sender in `yieldBox` should be transferred. |
| amount | uint256 | undefined |
| share | uint256 | The amount of shares to add for `to`. |

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

### borrowModule

```solidity
function borrowModule() external view returns (contract SGLBorrow)
```

returns the borrow module




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract SGLBorrow | undefined |

### borrowOpeningFee

```solidity
function borrowOpeningFee() external view returns (uint256)
```

borrowing opening fee




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### buyCollateral

```solidity
function buyCollateral(address from, uint256 borrowAmount, uint256 supplyAmount, uint256 minAmountOut, contract ISwapper swapper, bytes dexData) external nonpayable returns (uint256 amountOut)
```

Lever up: Borrow more and buy collateral with it.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | The user who buys |
| borrowAmount | uint256 | Amount of extra asset borrowed |
| supplyAmount | uint256 | Amount of asset supplied (down payment) |
| minAmountOut | uint256 | Minimal collateral amount to receive |
| swapper | contract ISwapper | Swapper to execute the purchase |
| dexData | bytes | Additional data to pass to the swapper |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | Actual collateral amount purchased |

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

### collateralModule

```solidity
function collateralModule() external view returns (contract SGLCollateral)
```

returns the collateral module




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract SGLCollateral | undefined |

### collateralizationRate

```solidity
function collateralizationRate() external view returns (uint256)
```

collateralization rate




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### computeAllowedLendShare

```solidity
function computeAllowedLendShare(uint256 amount, uint256 tokenId) external view returns (uint256 share)
```

transforms amount to shares for a market&#39;s permit operation



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | the amount to transform |
| tokenId | uint256 | the YieldBox asset id |

#### Returns

| Name | Type | Description |
|---|---|---|
| share | uint256 | amount transformed into shares |

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

### execute

```solidity
function execute(bytes[] calls, bool revertOnFail) external nonpayable returns (bool[] successes, string[] results)
```

Allows batched call to Singularity.



#### Parameters

| Name | Type | Description |
|---|---|---|
| calls | bytes[] | An array encoded call data. |
| revertOnFail | bool | If True then reverts after a failed call and stops doing further calls. |

#### Returns

| Name | Type | Description |
|---|---|---|
| successes | bool[] | count of successful operations |
| results | string[] | array of revert messages |

### fullUtilizationMinusMax

```solidity
function fullUtilizationMinusMax() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getInterestDetails

```solidity
function getInterestDetails() external view returns (struct ISingularity.AccrueInfo _accrueInfo, uint256 utilization)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _accrueInfo | ISingularity.AccrueInfo | undefined |
| utilization | uint256 | undefined |

### init

```solidity
function init(bytes data) external nonpayable
```

The init function that acts as a constructor



#### Parameters

| Name | Type | Description |
|---|---|---|
| data | bytes | undefined |

### interestElasticity

```solidity
function interestElasticity() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### leverageModule

```solidity
function leverageModule() external view returns (contract SGLLeverage)
```

returns the leverage module




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract SGLLeverage | undefined |

### liquidate

```solidity
function liquidate(address[] users, uint256[] maxBorrowParts, bytes[] collateralToAssetSwapDatas, bytes usdoToBorrowedSwapData, contract ISwapper swapper) external nonpayable
```

Entry point for liquidations.

*Will call `closedLiquidation()` if not LQ exists or no LQ bid avail exists. Otherwise use LQ.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| users | address[] | An array of user addresses. |
| maxBorrowParts | uint256[] | A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.        Ignore for `orderBookLiquidation()` |
| collateralToAssetSwapDatas | bytes[] | Extra swap data        Ignore for `orderBookLiquidation()` |
| usdoToBorrowedSwapData | bytes | Extra swap data        Ignore for `closedLiquidation()` |
| swapper | contract ISwapper | Contract address of the `ISwapper` implementation.        Ignore for `orderBookLiquidation()` |

### liquidateBadDebt

```solidity
function liquidateBadDebt(address user, address receiver, contract ISwapper swapper, bytes collateralToAssetSwapData) external nonpayable
```

liquidates a position where collateral value is less than the borrowed amount



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | to liquidate |
| receiver | address | funds receiver |
| swapper | contract ISwapper | contract address of the `ISwapper` implementation. |
| collateralToAssetSwapData | bytes | extra swap data |

### liquidationBonusAmount

```solidity
function liquidationBonusAmount() external view returns (uint256)
```

max liquidatable bonus amount




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### liquidationModule

```solidity
function liquidationModule() external view returns (contract SGLLiquidation)
```

returns the liquidation module




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract SGLLiquidation | undefined |

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

### multiHopBuyCollateral

```solidity
function multiHopBuyCollateral(address from, uint256 collateralAmount, uint256 borrowAmount, bool useAirdropped, IUSDOBase.ILeverageSwapData swapData, IUSDOBase.ILeverageLZData lzData, IUSDOBase.ILeverageExternalContractsData externalData) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| collateralAmount | uint256 | undefined |
| borrowAmount | uint256 | undefined |
| useAirdropped | bool | undefined |
| swapData | IUSDOBase.ILeverageSwapData | undefined |
| lzData | IUSDOBase.ILeverageLZData | undefined |
| externalData | IUSDOBase.ILeverageExternalContractsData | undefined |

### multiHopSellCollateral

```solidity
function multiHopSellCollateral(address from, uint256 share, bool useAirdropped, IUSDOBase.ILeverageSwapData swapData, IUSDOBase.ILeverageLZData lzData, IUSDOBase.ILeverageExternalContractsData externalData) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| share | uint256 | undefined |
| useAirdropped | bool | undefined |
| swapData | IUSDOBase.ILeverageSwapData | undefined |
| lzData | IUSDOBase.ILeverageLZData | undefined |
| externalData | IUSDOBase.ILeverageExternalContractsData | undefined |

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

### refreshPenroseFees

```solidity
function refreshPenroseFees() external nonpayable returns (uint256 feeShares)
```

Transfers fees to penrose

*can only be called by the owner*


#### Returns

| Name | Type | Description |
|---|---|---|
| feeShares | uint256 | undefined |

### removeAsset

```solidity
function removeAsset(address from, address to, uint256 fraction) external nonpayable returns (uint256 share)
```

Removes an asset from msg.sender and transfers it to `to`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Account to debit Assets from. |
| to | address | The user that receives the removed assets. |
| fraction | uint256 | The amount/fraction of assets held to remove. |

#### Returns

| Name | Type | Description |
|---|---|---|
| share | uint256 | The amount of shares transferred to `to`. |

### removeCollateral

```solidity
function removeCollateral(address from, address to, uint256 share) external nonpayable
```

Removes `share` amount of collateral and transfers it to `to`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Account to debit collateral from. |
| to | address | The receiver of the shares. |
| share | uint256 | Amount of shares to remove. |

### repay

```solidity
function repay(address from, address to, bool skim, uint256 part) external nonpayable returns (uint256 amount)
```

Repays a loan.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Address to repay from. |
| to | address | Address of the user this payment should go. |
| skim | bool | True if the amount should be skimmed from the deposit balance of msg.sender. False if tokens from msg.sender in `yieldBox` should be transferred. |
| part | uint256 | The amount to repay. See `userBorrowPart`. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | The total amount repayed. |

### rescueEth

```solidity
function rescueEth(uint256 amount, address to) external nonpayable
```

rescues unused ETH from the contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | the amount to rescue |
| to | address | the recipient |

### sellCollateral

```solidity
function sellCollateral(address from, uint256 share, uint256 minAmountOut, contract ISwapper swapper, bytes dexData) external nonpayable returns (uint256 amountOut)
```

Lever down: Sell collateral to repay debt; excess goes to YB



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | The user who sells |
| share | uint256 | Collateral YieldBox-shares to sell |
| minAmountOut | uint256 | Minimal proceeds required for the sale |
| swapper | contract ISwapper | Swapper to execute the sale |
| dexData | bytes | Additional data to pass to the swapper |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | Actual asset amount received in the sale |

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

### setLiquidationQueueConfig

```solidity
function setLiquidationQueueConfig(contract ILiquidationQueue _liquidationQueue, address _bidExecutionSwapper, address _usdoSwapper) external nonpayable
```

sets LQ specific confinguration



#### Parameters

| Name | Type | Description |
|---|---|---|
| _liquidationQueue | contract ILiquidationQueue | undefined |
| _bidExecutionSwapper | address | undefined |
| _usdoSwapper | address | undefined |

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

### setSingularityConfig

```solidity
function setSingularityConfig(uint256 _lqCollateralizationRate, uint256 _liquidationMultiplier, uint256 _minimumTargetUtilization, uint256 _maximumTargetUtilization, uint64 _minimumInterestPerSecond, uint64 _maximumInterestPerSecond, uint256 _interestElasticity) external nonpayable
```

sets Singularity specific configuration

*values are updated only if &gt; 0 or not address(0)*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _lqCollateralizationRate | uint256 | undefined |
| _liquidationMultiplier | uint256 | undefined |
| _minimumTargetUtilization | uint256 | undefined |
| _maximumTargetUtilization | uint256 | undefined |
| _minimumInterestPerSecond | uint64 | undefined |
| _maximumInterestPerSecond | uint64 | undefined |
| _interestElasticity | uint256 | undefined |

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

### yieldBoxShares

```solidity
function yieldBoxShares(address _user, uint256 _assetId) external view returns (uint256)
```

returns Total yieldBox shares for user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | The user to check shares for |
| _assetId | uint256 | The asset id to check shares for |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | shares value |



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
event ApprovalBorrow(address indexed owner, address indexed spender, uint256 value)
```

event emitted when borrow approval is performed



#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| spender `indexed` | address | undefined |
| value  | uint256 | undefined |

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
event InterestElasticityUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the interest elasticity updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

### Liquidated

```solidity
event Liquidated(address indexed liquidator, address[] users, uint256 liquidatorReward, uint256 protocolReward, uint256 repayedAmount, uint256 collateralShareRemoved)
```

event emitted when a position is liquidated



#### Parameters

| Name | Type | Description |
|---|---|---|
| liquidator `indexed` | address | undefined |
| users  | address[] | undefined |
| liquidatorReward  | uint256 | undefined |
| protocolReward  | uint256 | undefined |
| repayedAmount  | uint256 | undefined |
| collateralShareRemoved  | uint256 | undefined |

### LiquidationMultiplierUpdated

```solidity
event LiquidationMultiplierUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the liquidation multiplier rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

### LogAccrue

```solidity
event LogAccrue(uint256 accruedAmount, uint256 feeFraction, uint64 rate, uint256 utilization)
```

event emitted when accrual happens



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

event emitted when asset is added



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

event emitted when collateral is added



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

event emitted when asset is borrowed



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |
| feeAmount  | uint256 | undefined |
| part  | uint256 | undefined |

### LogBorrowCapUpdated

```solidity
event LogBorrowCapUpdated(uint256 _oldVal, uint256 _newVal)
```

event emitted when borrow cap is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _oldVal  | uint256 | undefined |
| _newVal  | uint256 | undefined |

### LogBorrowingFee

```solidity
event LogBorrowingFee(uint256 _oldVal, uint256 _newVal)
```

event emitted when borrow opening fee is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _oldVal  | uint256 | undefined |
| _newVal  | uint256 | undefined |

### LogExchangeRate

```solidity
event LogExchangeRate(uint256 rate)
```

event emitted when cached exchange rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| rate  | uint256 | undefined |

### LogRemoveAsset

```solidity
event LogRemoveAsset(address indexed from, address indexed to, uint256 share, uint256 fraction)
```

event emitted when asset is removed



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

event emitted when collateral is removed



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

event emitted when asset is repayed



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

event emitted when fees are extracted



#### Parameters

| Name | Type | Description |
|---|---|---|
| feeTo `indexed` | address | undefined |
| feesEarnedFraction  | uint256 | undefined |

### LogYieldBoxFeesDeposit

```solidity
event LogYieldBoxFeesDeposit(uint256 feeShares, uint256 ethAmount)
```

event emitted when fees are deposited to YieldBox



#### Parameters

| Name | Type | Description |
|---|---|---|
| feeShares  | uint256 | undefined |
| ethAmount  | uint256 | undefined |

### LqCollateralizationRateUpdated

```solidity
event LqCollateralizationRateUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the LQ collateralization rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

### MaximumInterestPerSecondUpdated

```solidity
event MaximumInterestPerSecondUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the maximum interest per second is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

### MaximumTargetUtilizationUpdated

```solidity
event MaximumTargetUtilizationUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the maximum target utilization is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

### MinimumInterestPerSecondUpdated

```solidity
event MinimumInterestPerSecondUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the minimum interest per second is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

### MinimumTargetUtilizationUpdated

```solidity
event MinimumTargetUtilizationUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the minimum target utilization is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

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
event OrderBookLiquidationMultiplierUpdated(uint256 oldVal, uint256 newVal)
```

event emitted when the order book liquidation multiplier rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldVal  | uint256 | undefined |
| newVal  | uint256 | undefined |

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
event PausedUpdated(enum Market.PauseType _type, bool oldState, bool newState)
```

event emitted when pause state is changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| _type  | enum Market.PauseType | undefined |
| oldState  | bool | undefined |
| newState  | bool | undefined |

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



