# YieldBox

*BoringCrypto, Keno*

> YieldBox

The YieldBox is a vault for tokens. The stored tokens can assigned to strategies. Yield from this will go to the token depositors. Any funds transfered directly onto the YieldBox will be lost, use the deposit function instead.



## Methods

### amountOf

```solidity
function amountOf(address user, uint256 assetId) external view returns (uint256 amount)
```



*Helper function represent the balance in `token` amount for a `user` for an `asset`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The `user` to get the amount for. |
| assetId | uint256 | The id of the asset. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### assetCount

```solidity
function assetCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### assets

```solidity
function assets(uint256) external view returns (enum TokenType tokenType, address contractAddress, contract IStrategy strategy, uint256 tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| tokenType | enum TokenType | undefined |
| contractAddress | address | undefined |
| strategy | contract IStrategy | undefined |
| tokenId | uint256 | undefined |

### balanceOf

```solidity
function balanceOf(address, uint256) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### balanceOfBatch

```solidity
function balanceOfBatch(address[] owners, uint256[] ids) external view returns (uint256[] balances)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owners | address[] | undefined |
| ids | uint256[] | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| balances | uint256[] | undefined |

### batch

```solidity
function batch(bytes[] calls, bool revertOnFail) external payable
```

Allows batched call to self (this contract).



#### Parameters

| Name | Type | Description |
|---|---|---|
| calls | bytes[] | An array of inputs for each call. |
| revertOnFail | bool | If True then reverts after a failed call and stops doing further calls. |

### batchTransfer

```solidity
function batchTransfer(address from, address to, uint256[] assetIds_, uint256[] shares_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| assetIds_ | uint256[] | undefined |
| shares_ | uint256[] | undefined |

### burn

```solidity
function burn(uint256 tokenId, address from, uint256 amount) external nonpayable
```

Burns tokens. Only the holder of tokens can burn them.



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | The token to be burned. |
| from | address | undefined |
| amount | uint256 | The amount of tokens to burn. |

### claimOwnership

```solidity
function claimOwnership(uint256 tokenId) external nonpayable
```

Needs to be called by `pendingTokenOwner` to claim ownership.



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | The `tokenId` of the token that ownership is claimed for. |

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

### createToken

```solidity
function createToken(string name, string symbol, uint8 decimals) external nonpayable returns (uint256 tokenId)
```

Create a new native token. This will be an ERC1155 token. If later it&#39;s needed as an ERC20 token it can be wrapped into an ERC20 token. Native support for ERC1155 tokens is growing though.



#### Parameters

| Name | Type | Description |
|---|---|---|
| name | string | The name of the token. |
| symbol | string | The symbol of the token. |
| decimals | uint8 | The number of decimals of the token (this is just for display purposes). Should be set to 18 in normal cases. |

#### Returns

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined |

### decimals

```solidity
function decimals(uint256 assetId) external view returns (uint8)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined |

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

### deposit

```solidity
function deposit(enum TokenType tokenType, address contractAddress, contract IStrategy strategy, uint256 tokenId, address from, address to, uint256 amount, uint256 share) external nonpayable returns (uint256 amountOut, uint256 shareOut)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenType | enum TokenType | undefined |
| contractAddress | address | undefined |
| strategy | contract IStrategy | undefined |
| tokenId | uint256 | undefined |
| from | address | undefined |
| to | address | undefined |
| amount | uint256 | undefined |
| share | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined |
| shareOut | uint256 | undefined |

### depositAsset

```solidity
function depositAsset(uint256 assetId, address from, address to, uint256 amount, uint256 share) external nonpayable returns (uint256 amountOut, uint256 shareOut)
```

Deposit an amount of `token` represented in either `amount` or `share`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | The id of the asset. |
| from | address | which account to pull the tokens. |
| to | address | which account to push the tokens. |
| amount | uint256 | Token amount in native representation to deposit. |
| share | uint256 | Token amount represented in shares to deposit. Takes precedence over `amount`. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | The amount deposited. |
| shareOut | uint256 | The deposited amount repesented in shares. |

### depositETH

```solidity
function depositETH(contract IStrategy strategy, address to, uint256 amount) external payable returns (uint256 amountOut, uint256 shareOut)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| strategy | contract IStrategy | undefined |
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined |
| shareOut | uint256 | undefined |

### depositETHAsset

```solidity
function depositETHAsset(uint256 assetId, address to, uint256 amount) external payable returns (uint256 amountOut, uint256 shareOut)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined |
| shareOut | uint256 | undefined |

### ids

```solidity
function ids(enum TokenType, address, contract IStrategy, uint256) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | enum TokenType | undefined |
| _1 | address | undefined |
| _2 | contract IStrategy | undefined |
| _3 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### isApprovedForAll

```solidity
function isApprovedForAll(address, address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

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

### mint

```solidity
function mint(uint256 tokenId, address to, uint256 amount) external nonpayable
```

The `tokenOwner` can mint tokens. If a fixed supply is needed, the `tokenOwner`         should mint the totalSupply and renounce ownership.



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | The token to be minted. |
| to | address | The account to transfer the minted tokens to. |
| amount | uint256 | The amount of tokens to mint. |

### name

```solidity
function name(uint256 assetId) external view returns (string)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### nativeTokens

```solidity
function nativeTokens(uint256) external view returns (string name, string symbol, uint8 decimals)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| name | string | undefined |
| symbol | string | undefined |
| decimals | uint8 | undefined |

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) external pure returns (bytes4)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | address | undefined |
| _2 | uint256[] | undefined |
| _3 | uint256[] | undefined |
| _4 | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined |

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) external pure returns (bytes4)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | address | undefined |
| _2 | uint256 | undefined |
| _3 | uint256 | undefined |
| _4 | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined |

### pendingTokenOwner

```solidity
function pendingTokenOwner(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### permitToken

```solidity
function permitToken(contract IERC20 token, address from, address to, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external nonpayable
```

Call wrapper that performs `ERC20.permit` on `token`. Lookup `IERC20.permit`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC20 | undefined |
| from | address | undefined |
| to | address | undefined |
| amount | uint256 | undefined |
| deadline | uint256 | undefined |
| v | uint8 | undefined |
| r | bytes32 | undefined |
| s | bytes32 | undefined |

### registerAsset

```solidity
function registerAsset(enum TokenType tokenType, address contractAddress, contract IStrategy strategy, uint256 tokenId) external nonpayable returns (uint256 assetId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenType | enum TokenType | undefined |
| contractAddress | address | undefined |
| strategy | contract IStrategy | undefined |
| tokenId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| ids | uint256[] | undefined |
| values | uint256[] | undefined |
| data | bytes | undefined |

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| id | uint256 | undefined |
| value | uint256 | undefined |
| data | bytes | undefined |

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| operator | address | undefined |
| approved | bool | undefined |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceID) external pure returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceID | bytes4 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### symbol

```solidity
function symbol(uint256 assetId) external view returns (string)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### toAmount

```solidity
function toAmount(uint256 assetId, uint256 share, bool roundUp) external view returns (uint256 amount)
```



*Helper function represent shares back into the `token` amount.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | The id of the asset. |
| share | uint256 | The amount of shares. |
| roundUp | bool | If the result should be rounded up. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | The share amount back into native representation. |

### toShare

```solidity
function toShare(uint256 assetId, uint256 amount, bool roundUp) external view returns (uint256 share)
```



*Helper function to represent an `amount` of `token` in shares.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | The id of the asset. |
| amount | uint256 | The `token` amount. |
| roundUp | bool | If the result `share` should be rounded up. |

#### Returns

| Name | Type | Description |
|---|---|---|
| share | uint256 | The token amount represented in shares. |

### tokenOwner

```solidity
function tokenOwner(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### totalSupply

```solidity
function totalSupply(uint256) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transfer

```solidity
function transfer(address from, address to, uint256 assetId, uint256 share) external nonpayable
```

Transfer shares from a user account to another one.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | which user to pull the tokens. |
| to | address | which user to push the tokens. |
| assetId | uint256 | The id of the asset. |
| share | uint256 | The amount of `token` in shares. |

### transferMultiple

```solidity
function transferMultiple(address from, address[] tos, uint256 assetId, uint256[] shares) external nonpayable
```

Transfer shares from a user account to multiple other ones.



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | which user to pull the tokens. |
| tos | address[] | The receivers of the tokens. |
| assetId | uint256 | The id of the asset. |
| shares | uint256[] | The amount of `token` in shares for each receiver in `tos`. |

### transferOwnership

```solidity
function transferOwnership(uint256 tokenId, address newTokenOwner, bool direct, bool renounce) external nonpayable
```

Transfers ownership to `newTokenOwner`. Either directly or claimable by the new pending tokenOwner. Can only be invoked by the current `tokenOwner`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | The `tokenId` of the token that ownership whose ownership will be transferred/renounced. |
| newTokenOwner | address | Address of the new tokenOwner. |
| direct | bool | True if `newTokenOwner` should be set immediately. False if `newTokenOwner` needs to use `claimOwnership`. |
| renounce | bool | Allows the `newTokenOwner` to be `address(0)` if `direct` and `renounce` is True. Has no effect otherwise. |

### uri

```solidity
function uri(uint256 assetId) external view returns (string)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### uriBuilder

```solidity
function uriBuilder() external view returns (contract YieldBoxURIBuilder)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract YieldBoxURIBuilder | undefined |

### withdraw

```solidity
function withdraw(uint256 assetId, address from, address to, uint256 amount, uint256 share) external nonpayable returns (uint256 amountOut, uint256 shareOut)
```

Withdraws an amount of `token` from a user account.



#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | The id of the asset. |
| from | address | which user to pull the tokens. |
| to | address | which user to push the tokens. |
| amount | uint256 | of tokens. Either one of `amount` or `share` needs to be supplied. |
| share | uint256 | Like above, but `share` takes precedence over `amount`. |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined |
| shareOut | uint256 | undefined |

### wrappedNative

```solidity
function wrappedNative() external view returns (contract IWrappedNative)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IWrappedNative | undefined |



## Events

### ApprovalForAll

```solidity
event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _owner `indexed` | address | undefined |
| _operator `indexed` | address | undefined |
| _approved  | bool | undefined |

### AssetDeposited

```solidity
event AssetDeposited(uint256 indexed assetId, address indexed from, address indexed to, uint256 amount, uint256 shares)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId `indexed` | uint256 | undefined |
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |
| shares  | uint256 | undefined |

### AssetRegistered

```solidity
event AssetRegistered(enum TokenType indexed tokenType, address indexed contractAddress, contract IStrategy strategy, uint256 indexed tokenId, uint256 assetId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenType `indexed` | enum TokenType | undefined |
| contractAddress `indexed` | address | undefined |
| strategy  | contract IStrategy | undefined |
| tokenId `indexed` | uint256 | undefined |
| assetId  | uint256 | undefined |

### AssetWithdrawn

```solidity
event AssetWithdrawn(uint256 indexed assetId, address indexed from, address indexed to, uint256 amount, uint256 shares)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId `indexed` | uint256 | undefined |
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |
| shares  | uint256 | undefined |

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

### OwnershipTransferred

```solidity
event OwnershipTransferred(uint256 indexed tokenId, address indexed previousTokenOwner, address indexed newTokenOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId `indexed` | uint256 | undefined |
| previousTokenOwner `indexed` | address | undefined |
| newTokenOwner `indexed` | address | undefined |

### TokenCreated

```solidity
event TokenCreated(address indexed creator, string name, string symbol, uint8 decimals, uint256 tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| creator `indexed` | address | undefined |
| name  | string | undefined |
| symbol  | string | undefined |
| decimals  | uint8 | undefined |
| tokenId  | uint256 | undefined |

### TransferBatch

```solidity
event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _operator `indexed` | address | undefined |
| _from `indexed` | address | undefined |
| _to `indexed` | address | undefined |
| _ids  | uint256[] | undefined |
| _values  | uint256[] | undefined |

### TransferSingle

```solidity
event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _operator `indexed` | address | undefined |
| _from `indexed` | address | undefined |
| _to `indexed` | address | undefined |
| _id  | uint256 | undefined |
| _value  | uint256 | undefined |

### URI

```solidity
event URI(string _value, uint256 indexed _id)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _value  | string | undefined |
| _id `indexed` | uint256 | undefined |



