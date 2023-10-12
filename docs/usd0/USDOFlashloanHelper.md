# USDOFlashloanHelper









## Methods

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

returns the allowance for spender



#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| spender | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### approve

```solidity
function approve(address spender, uint256 amount) external nonpayable returns (bool)
```

approves address for spending



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | the spender&#39;s address |
| amount | uint256 | the allowance amount |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### claimOwnership

```solidity
function claimOwnership() external nonpayable
```

Needs to be called by `pendingOwner` to claim ownership.




### flashFee

```solidity
function flashFee(address token, uint256 amount) external view returns (uint256)
```

returns the flash mint fee



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | USDO address |
| amount | uint256 | the amount for which fee is computed |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### flashLoan

```solidity
function flashLoan(contract IERC3156FlashBorrower receiver, address token, uint256 amount, bytes data) external nonpayable returns (bool)
```

performs a USDO flashloan



#### Parameters

| Name | Type | Description |
|---|---|---|
| receiver | contract IERC3156FlashBorrower | the IERC3156FlashBorrower receiver |
| token | address | USDO address |
| amount | uint256 | the amount to flashloan |
| data | bytes | flashloan data |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | operation execution status |

### flashMintFee

```solidity
function flashMintFee() external view returns (uint256)
```

returns the flash mint fee




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### maxFlashLoan

```solidity
function maxFlashLoan(address) external view returns (uint256)
```

returns the maximum amount of tokens available for a flash mint



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### maxFlashMint

```solidity
function maxFlashMint() external view returns (uint256)
```

returns the maximum amount of USDO that can be minted through the EIP-3156 flow




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

### setFlashMintFee

```solidity
function setFlashMintFee(uint256 _val) external nonpayable
```

set the flashloan fee

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _val | uint256 | the new fee |

### setMaxFlashMintable

```solidity
function setMaxFlashMintable(uint256 _val) external nonpayable
```

set the max allowed USDO mintable through flashloan

*can only be called by the owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _val | uint256 | the new amount |

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

### usdo

```solidity
function usdo() external view returns (contract IUSDO)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IUSDO | undefined |



## Events

### FlashMintFeeUpdated

```solidity
event FlashMintFeeUpdated(uint256 _old, uint256 _new)
```

event emitted when flash mint fee is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _old  | uint256 | undefined |
| _new  | uint256 | undefined |

### MaxFlashMintUpdated

```solidity
event MaxFlashMintUpdated(uint256 _old, uint256 _new)
```

event emitted when max flash mintable amount is updated



#### Parameters

| Name | Type | Description |
|---|---|---|
| _old  | uint256 | undefined |
| _new  | uint256 | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |



