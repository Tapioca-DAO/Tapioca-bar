# IBatchFlashBorrower









## Methods

### onBatchFlashLoan

```solidity
function onBatchFlashLoan(address sender, contract IERC20[] tokens, uint256[] amounts, uint256[] fees, bytes data) external nonpayable
```

The callback for batched flashloans. Every amount + fee needs to repayed to msg.sender before this call returns.



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | The address of the invoker of this flashloan. |
| tokens | contract IERC20[] | Array of addresses for ERC-20 tokens that is loaned. |
| amounts | uint256[] | A one-to-one map to `tokens` that is loaned. |
| fees | uint256[] | A one-to-one map to `tokens` that needs to be paid on top for each loan. Needs to be the same token. |
| data | bytes | Additional data that was passed to the flashloan function. |




