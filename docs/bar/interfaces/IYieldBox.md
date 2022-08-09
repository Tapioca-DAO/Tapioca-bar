# IYieldBox









## Methods

### assets

```solidity
function assets(uint256 assetId) external view returns (enum TokenType tokenType, address contractAddress, contract IStrategy strategy, uint256 tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| tokenType | enum TokenType | undefined |
| contractAddress | address | undefined |
| strategy | contract IStrategy | undefined |
| tokenId | uint256 | undefined |

### nativeTokens

```solidity
function nativeTokens(uint256 assetId) external view returns (string name, string symbol, uint8 decimals)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| name | string | undefined |
| symbol | string | undefined |
| decimals | uint8 | undefined |

### owner

```solidity
function owner(uint256 assetId) external view returns (address owner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |

### totalSupply

```solidity
function totalSupply(uint256 assetId) external view returns (uint256 totalSupply)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| assetId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| totalSupply | uint256 | undefined |

### wrappedNative

```solidity
function wrappedNative() external view returns (address wrappedNative)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| wrappedNative | address | undefined |




