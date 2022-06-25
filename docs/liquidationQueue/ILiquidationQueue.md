# ILiquidationQueue









## Methods

### executeBids

```solidity
function executeBids(uint256 collateralAmountToLiquidate) external nonpayable returns (uint256 amountExecuted, uint256 collateralLiquidated)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| collateralAmountToLiquidate | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amountExecuted | uint256 | undefined |
| collateralLiquidated | uint256 | undefined |

### getNextAvailBidPool

```solidity
function getNextAvailBidPool() external view returns (uint256 i, bool available)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| i | uint256 | undefined |
| available | bool | undefined |

### init

```solidity
function init(LiquidationQueueMeta) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | LiquidationQueueMeta | undefined |




