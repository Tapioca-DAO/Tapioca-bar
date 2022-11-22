# SingularityHelper







*This contract provides useful helper functions for `Singularity`.*

## Methods

### getAmountForAssetFraction

```solidity
function getAmountForAssetFraction(contract Singularity mixologist, uint256 fraction) external view returns (uint256)
```



*Compute the amount of `mixologist.assetId` from `fraction` `fraction` can be `mixologist.accrueInfo.feeFraction` or `mixologist.balanceOf`*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mixologist | contract Singularity | undefined |
| fraction | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getCollateralSharesForBorrowPart

```solidity
function getCollateralSharesForBorrowPart(contract Singularity mixologist, uint256 borrowPart) external view returns (uint256)
```



*Helper function to calculate the collateral shares that are needed for `borrowPart`, taking the current exchange rate into account.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| mixologist | contract Singularity | undefined |
| borrowPart | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |




