# Penrose



> Global market registry

+ asset registration? (toggle to renounce ownership so users can call)Singularity management



## Methods

### _getMasterContractLength

```solidity
function _getMasterContractLength(IPenrose.MasterContract[] array) external view returns (address[] markets)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| array | IPenrose.MasterContract[] | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| markets | address[] | undefined |

### addBigBang

```solidity
function addBigBang(address mc, address _contract) external nonpayable
```

Registers an existing BigBang market (without deployment)

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mc | address | The address of the master contract which must be already registered |
| _contract | address | undefined |

### addSingularity

```solidity
function addSingularity(address mc, address _contract) external nonpayable
```

Registers an existing Singularity market (without deployment)

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mc | address | The address of the master contract which must be already registered |
| _contract | address | undefined |

### allBigBangMarkets

```solidity
function allBigBangMarkets(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### bigBangEthDebtRate

```solidity
function bigBangEthDebtRate() external view returns (uint256)
```

BigBang ETH market debt rate




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### bigBangEthMarket

```solidity
function bigBangEthMarket() external view returns (address)
```

BigBang ETH market addressf




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### bigBangMarkets

```solidity
function bigBangMarkets() external view returns (address[] markets)
```

Get all the BigBang contract addresses




#### Returns

| Name | Type | Description |
|---|---|---|
| markets | address[] | list of available markets |

### bigBangMasterContractLength

```solidity
function bigBangMasterContractLength() external view returns (uint256)
```

Get the length of `bigbangMasterContracts`




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### bigbangMasterContracts

```solidity
function bigbangMasterContracts(uint256) external view returns (address location, enum IPenrose.ContractType risk)
```

BigBang master contracts



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| location | address | undefined |
| risk | enum IPenrose.ContractType | undefined |

### claimOwnership

```solidity
function claimOwnership() external nonpayable
```

Needs to be called by `pendingOwner` to claim ownership.




### clonesOf

```solidity
function clonesOf(address, uint256) external view returns (address)
```

Mapping from masterContract to an array of all clones On mainnet events can be used to get this list, but events aren&#39;t always easy to retrieve and barely work on sidechains. While this adds gas, it makes enumerating all clones much easier.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### clonesOfCount

```solidity
function clonesOfCount(address masterContract) external view returns (uint256 cloneCount)
```

Returns the count of clones that exists for a specific masterContract



#### Parameters

| Name | Type | Description |
|---|---|---|
| masterContract | address | The address of the master contract. |

#### Returns

| Name | Type | Description |
|---|---|---|
| cloneCount | uint256 | total number of clones for the masterContract. |

### cluster

```solidity
function cluster() external view returns (contract ICluster)
```

returns the Cluster contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICluster | undefined |

### conservator

```solidity
function conservator() external view returns (address)
```

returns the Conservator address




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### deploy

```solidity
function deploy(address masterContract, bytes data, bool useCreate2) external payable returns (address cloneAddress)
```

Deploys a given master Contract as a clone. Any ETH transferred with this call is forwarded to the new clone. Emits `LogDeploy`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| masterContract | address | The address of the contract to clone. |
| data | bytes | Additional abi encoded calldata that is passed to the new clone via `IMasterContract.init`. |
| useCreate2 | bool | Creates the clone by using the CREATE2 opcode, in this case `data` will be used as salt. |

#### Returns

| Name | Type | Description |
|---|---|---|
| cloneAddress | address | Address of the created clone contract. |

### emptyStrategies

```solidity
function emptyStrategies(address) external view returns (contract IStrategy)
```

registered empty strategies



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStrategy | undefined |

### executeMarketFn

```solidity
function executeMarketFn(address[] mc, bytes[] data, bool forceSuccess) external nonpayable returns (bool[] success, bytes[] result)
```

Execute an only owner function inside of a Singularity or a BigBang market



#### Parameters

| Name | Type | Description |
|---|---|---|
| mc | address[] | undefined |
| data | bytes[] | undefined |
| forceSuccess | bool | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool[] | undefined |
| result | bytes[] | undefined |

### hostLzChainId

```solidity
function hostLzChainId() external view returns (uint16)
```

default LZ Chain id




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined |

### isBigBangMasterContractRegistered

```solidity
function isBigBangMasterContractRegistered(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isMarketRegistered

```solidity
function isMarketRegistered(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isSingularityMasterContractRegistered

```solidity
function isSingularityMasterContractRegistered(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### mainAssetId

```solidity
function mainAssetId() external view returns (uint256)
```

returns WETH/main asset id registered in the YieldBox contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### mainToken

```solidity
function mainToken() external view returns (contract IERC20)
```

returns the WETH/main contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

### masterContractOf

```solidity
function masterContractOf(address) external view returns (address)
```

Mapping from clone contracts to their masterContract.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### owner

```solidity
function owner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### paused

```solidity
function paused() external view returns (bool)
```

returns the pause state of the contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### pendingOwner

```solidity
function pendingOwner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### reAccrueBigBangMarkets

```solidity
function reAccrueBigBangMarkets() external nonpayable
```

Calls `accrue()` on all BigBang registered markets

*callable by BigBang ETH market only*


### registerBigBang

```solidity
function registerBigBang(address mc, bytes data, bool useCreate2) external payable returns (address _contract)
```

Registers a BigBang market

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mc | address | The address of the master contract which must be already registered |
| data | bytes | The init data of the BigBang contract |
| useCreate2 | bool | Whether to use create2 or not |

#### Returns

| Name | Type | Description |
|---|---|---|
| _contract | address | undefined |

### registerBigBangMasterContract

```solidity
function registerBigBangMasterContract(address mcAddress, enum IPenrose.ContractType contractType_) external nonpayable
```

Register a BigBang master contract

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mcAddress | address | The address of the contract |
| contractType_ | enum IPenrose.ContractType | The risk type of the contract |

### registerSingularity

```solidity
function registerSingularity(address mc, bytes data, bool useCreate2) external payable returns (address _contract)
```

Registers a Singularity market

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mc | address | The address of the master contract which must be already registered |
| data | bytes | The init data of the Singularity |
| useCreate2 | bool | Whether to use create2 or not |

#### Returns

| Name | Type | Description |
|---|---|---|
| _contract | address | undefined |

### registerSingularityMasterContract

```solidity
function registerSingularityMasterContract(address mcAddress, enum IPenrose.ContractType contractType_) external nonpayable
```

Register a Singularity master contract

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mcAddress | address | The address of the contract |
| contractType_ | enum IPenrose.ContractType | The risk type of the contract |

### setBigBangEthMarket

```solidity
function setBigBangEthMarket(address _market) external nonpayable
```

sets the main BigBang market

*needed for the variable debt computation*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | undefined |

### setBigBangEthMarketDebtRate

```solidity
function setBigBangEthMarketDebtRate(uint256 _rate) external nonpayable
```

sets the main BigBang market debt rate

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _rate | uint256 | the new rate |

### setConservator

```solidity
function setConservator(address _conservator) external nonpayable
```

Set the Conservator address

*Conservator can pause the contract*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _conservator | address | The new address |

### setUsdoToken

```solidity
function setUsdoToken(address _usdoToken) external nonpayable
```

Set the USDO token

*sets usdoToken and usdoAssetId      can only by called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _usdoToken | address | the USDO token address |

### singularityMarkets

```solidity
function singularityMarkets() external view returns (address[] markets)
```

Get all the Singularity contract addresses




#### Returns

| Name | Type | Description |
|---|---|---|
| markets | address[] | list of available markets |

### singularityMasterContractLength

```solidity
function singularityMasterContractLength() external view returns (uint256)
```

Get the length of `singularityMasterContracts`




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### singularityMasterContracts

```solidity
function singularityMasterContracts(uint256) external view returns (address location, enum IPenrose.ContractType risk)
```

Singularity master contracts



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| location | address | undefined |
| risk | enum IPenrose.ContractType | undefined |

### tapAssetId

```solidity
function tapAssetId() external view returns (uint256)
```

returns TAP asset id registered in the YieldBox contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### tapToken

```solidity
function tapToken() external view returns (contract IERC20)
```

returns the TAP contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

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

### updatePause

```solidity
function updatePause(bool val) external nonpayable
```

updates the pause state of the contract

*can only be called by the conservator*

#### Parameters

| Name | Type | Description |
|---|---|---|
| val | bool | the new value |

### usdoAssetId

```solidity
function usdoAssetId() external view returns (uint256)
```

returns USDO asset id registered in the YieldBox contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### usdoToken

```solidity
function usdoToken() external view returns (contract IERC20)
```

returns USDO contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

### withdrawAllMarketFees

```solidity
function withdrawAllMarketFees(contract IMarket[] markets_, contract ITwTap twTap) external nonpayable
```

Loop through the master contracts and call `_depositFeesToYieldBox()` to each one of their clones.



#### Parameters

| Name | Type | Description |
|---|---|---|
| markets_ | contract IMarket[] | Singularity &amp;/ BigBang markets array |
| twTap | contract ITwTap | the TwTap contract |

### yieldBox

```solidity
function yieldBox() external view returns (contract YieldBox)
```

returns the YieldBox contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract YieldBox | undefined |



## Events

### BigBangEthMarketDebtRate

```solidity
event BigBangEthMarketDebtRate(uint256 _rate)
```

event emitted when BigBang ETH market debt rate is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _rate  | uint256 | undefined |

### BigBangEthMarketSet

```solidity
event BigBangEthMarketSet(address indexed _newAddress)
```

event emitted when BigBang ETH market address is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _newAddress `indexed` | address | undefined |

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

### LogDeploy

```solidity
event LogDeploy(address indexed masterContract, bytes data, address indexed cloneAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| masterContract `indexed` | address | undefined |
| data  | bytes | undefined |
| cloneAddress `indexed` | address | undefined |

### LogTwTapFeesDeposit

```solidity
event LogTwTapFeesDeposit(uint256 feeShares, uint256 ethAmount)
```

event emitted when fees are deposited to twTap



#### Parameters

| Name | Type | Description |
|---|---|---|
| feeShares  | uint256 | undefined |
| ethAmount  | uint256 | undefined |

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
event PausedUpdated(bool oldState, bool newState)
```

event emitted when pause state is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| oldState  | bool | undefined |
| newState  | bool | undefined |

### ProtocolWithdrawal

```solidity
event ProtocolWithdrawal(contract IMarket[] markets, uint256 timestamp)
```

event emitted when fees are extracted



#### Parameters

| Name | Type | Description |
|---|---|---|
| markets  | contract IMarket[] | undefined |
| timestamp  | uint256 | undefined |

### RegisterBigBang

```solidity
event RegisterBigBang(address indexed location, address indexed masterContract)
```

event emitted when BigBang is registered



#### Parameters

| Name | Type | Description |
|---|---|---|
| location `indexed` | address | undefined |
| masterContract `indexed` | address | undefined |

### RegisterBigBangMasterContract

```solidity
event RegisterBigBangMasterContract(address indexed location, enum IPenrose.ContractType risk)
```

event emitted when BigBang master contract is registered



#### Parameters

| Name | Type | Description |
|---|---|---|
| location `indexed` | address | undefined |
| risk  | enum IPenrose.ContractType | undefined |

### RegisterSingularity

```solidity
event RegisterSingularity(address indexed location, address indexed masterContract)
```

event emitted when Singularity is registered



#### Parameters

| Name | Type | Description |
|---|---|---|
| location `indexed` | address | undefined |
| masterContract `indexed` | address | undefined |

### RegisterSingularityMasterContract

```solidity
event RegisterSingularityMasterContract(address indexed location, enum IPenrose.ContractType risk)
```

event emitted when Singularity master contract is registered



#### Parameters

| Name | Type | Description |
|---|---|---|
| location `indexed` | address | undefined |
| risk  | enum IPenrose.ContractType | undefined |

### SwapperUpdate

```solidity
event SwapperUpdate(address indexed swapper, uint16 indexed id, bool isRegistered)
```

event emitted when ISwapper address is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| swapper `indexed` | address | undefined |
| id `indexed` | uint16 | undefined |
| isRegistered  | bool | undefined |

### UsdoTokenUpdated

```solidity
event UsdoTokenUpdated(address indexed usdoToken, uint256 assetId)
```

event emitted when USDO address is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| usdoToken `indexed` | address | undefined |
| assetId  | uint256 | undefined |



