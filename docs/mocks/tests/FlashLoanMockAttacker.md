# FlashLoanMockAttacker









## Methods

### onFlashLoan

```solidity
function onFlashLoan(address sender, contract IERC20 token, uint256 amount, uint256 fee, bytes data) external nonpayable
```

The flashloan callback. `amount` + `fee` needs to repayed to msg.sender before this call returns.



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | The address of the invoker of this flashloan. |
| token | contract IERC20 | The address of the token that is loaned. |
| amount | uint256 | of the `token` that is loaned. |
| fee | uint256 | The fee that needs to be paid on top for this loan. Needs to be the same as `token`. |
| data | bytes | Additional data that was passed to the flashloan function. |




