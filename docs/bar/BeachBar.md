# BeachBar





+ asset registration? (toggle to renounce ownership so users can call)



## Methods

### claimOwnership

```solidity
function claimOwnership() external nonpayable
```

Needs to be called by `pendingOwner` to claim ownership.




### executeMixologistFn

```solidity
function executeMixologistFn(address[] mc, bytes[] data) external nonpayable returns (bool[] success, bytes[] result)
```

Execute an only owner function inside of a Mixologist market



#### Parameters

| Name | Type | Description |
|---|---|---|
| mc | address[] | undefined |
| data | bytes[] | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool[] | undefined |
| result | bytes[] | undefined |

### feeTo

```solidity
function feeTo() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### feeVeTap

```solidity
function feeVeTap() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### masterContractLength

```solidity
function masterContractLength() external view returns (uint256)
```

Get the length of `masterContracts`




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### masterContracts

```solidity
function masterContracts(uint256) external view returns (address location, enum ContractType risk)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| location | address | undefined |
| risk | enum ContractType | undefined |

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

### registerMasterContract

```solidity
function registerMasterContract(address mcAddress, enum ContractType contractType_) external nonpayable
```

Register a master contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| mcAddress | address | The address of the contract |
| contractType_ | enum ContractType | The risk type of the contract |

### registerMixologist

```solidity
function registerMixologist(address mc, bytes data, bool useCreate2) external payable returns (address _contract)
```

Register a Mixologist



#### Parameters

| Name | Type | Description |
|---|---|---|
| mc | address | The address of the master contract which must be already registered |
| data | bytes | The init data of the Mixologist |
| useCreate2 | bool | Whether to use create2 or not |

#### Returns

| Name | Type | Description |
|---|---|---|
| _contract | address | undefined |

### setFeeTo

```solidity
function setFeeTo(address feeTo_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| feeTo_ | address | undefined |

### setFeeVeTap

```solidity
function setFeeVeTap(address feeVeTap_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| feeVeTap_ | address | undefined |

### setSwapper

```solidity
function setSwapper(contract MultiSwapper swapper, bool enable) external nonpayable
```

Used to register and enable or disable swapper contracts used in closed liquidations. MasterContract Only Admin function.



#### Parameters

| Name | Type | Description |
|---|---|---|
| swapper | contract MultiSwapper | The address of the swapper contract that conforms to `ISwapper`. |
| enable | bool | True to enable the swapper. To disable use False. |

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

### tapAssetId

```solidity
function tapAssetId() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### tapToken

```solidity
function tapToken() external view returns (contract IERC20)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined |

### tapiocaMarkets

```solidity
function tapiocaMarkets() external view returns (address[] markets)
```

Get all the Mixologist contract addresses




#### Returns

| Name | Type | Description |
|---|---|---|
| markets | address[] | undefined |

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

### withdrawAllProtocolFees

```solidity
function withdrawAllProtocolFees(contract MultiSwapper[] swappers_) external nonpayable
```

Loop through the master contracts and call `depositFeesToYieldBox()` to each one of their clones.

*`swappers_` can have one element that&#39;ll be used for all clones. Or one swapper per MasterContract.Fees are withdrawn in TAP and sent to the FeeDistributor contract*

#### Parameters

| Name | Type | Description |
|---|---|---|
| swappers_ | contract MultiSwapper[] | One or more swappers to convert the asset to TAP. |

### yieldBox

```solidity
function yieldBox() external view returns (contract YieldBox)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract YieldBox | undefined |



## Events

### FeeToUpdate

```solidity
event FeeToUpdate(address newFeeTo)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newFeeTo  | address | undefined |

### FeeVeTapUpdate

```solidity
event FeeVeTapUpdate(address newFeeVeTap)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newFeeVeTap  | address | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### ProtocolWithdrawal

```solidity
event ProtocolWithdrawal(address[] markets, uint256 timestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| markets  | address[] | undefined |
| timestamp  | uint256 | undefined |

### RegisterMasterContract

```solidity
event RegisterMasterContract(address location, enum ContractType risk)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| location  | address | undefined |
| risk  | enum ContractType | undefined |

### RegisterMixologist

```solidity
event RegisterMixologist(address location, address masterContract)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| location  | address | undefined |
| masterContract  | address | undefined |

### SwapperUpdate

```solidity
event SwapperUpdate(address swapper, bool isRegistered)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| swapper  | address | undefined |
| isRegistered  | bool | undefined |



