# MarketERC20









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



