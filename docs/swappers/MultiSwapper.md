# MultiSwapper





Modified from https://github.com/sushiswap/kashi-lending/blob/master/contracts/swappers/SushiSwapMultiSwapper.sol



## Methods

### getOutputAmount

```solidity
function getOutputAmount(uint256 tokenInId, address[] path, uint256 shareIn) external view returns (uint256 amountOut)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenInId | uint256 | undefined |
| path | address[] | undefined |
| shareIn | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined |

### swap

```solidity
function swap(uint256 tokenInId, uint256 tokenOutId, uint256 amountMinOut, address to, address[] path, uint256 shareIn) external nonpayable returns (uint256 amountOut, uint256 shareOut)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenInId | uint256 | undefined |
| tokenOutId | uint256 | undefined |
| amountMinOut | uint256 | undefined |
| to | address | undefined |
| path | address[] | undefined |
| shareIn | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined |
| shareOut | uint256 | undefined |




