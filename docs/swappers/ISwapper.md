# ISwapper





Modified from https://github.com/sushiswap/kashi-lending/blob/master/contracts/interfaces/ISwapper.sol



## Methods

### swap

```solidity
function swap(contract IERC20 fromToken, uint256 fromTokenId, contract IERC20 toToken, uint256 toTokenId, address recipient, uint256 shareToMin, uint256 shareFrom) external nonpayable returns (uint256 extraShare, uint256 shareReturned)
```

Withdraws &#39;amountFrom&#39; of token &#39;from&#39; from the BeachBar account for this swapper. Swaps it for at least &#39;amountToMin&#39; of token &#39;to&#39;. Transfers the swapped tokens of &#39;to&#39; into the BeachBar using a plain ERC20 transfer. Returns the amount of tokens &#39;to&#39; transferred to BeachBar. (The BeachBar skim function will be used by the caller to get the swapped funds).



#### Parameters

| Name | Type | Description |
|---|---|---|
| fromToken | contract IERC20 | undefined |
| fromTokenId | uint256 | undefined |
| toToken | contract IERC20 | undefined |
| toTokenId | uint256 | undefined |
| recipient | address | undefined |
| shareToMin | uint256 | undefined |
| shareFrom | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| extraShare | uint256 | undefined |
| shareReturned | uint256 | undefined |

### swapExact

```solidity
function swapExact(contract IERC20 fromToken, uint256 fromTokenId, contract IERC20 toToken, uint256 toTokenId, address recipient, address refundTo, uint256 shareFromSupplied, uint256 shareToExact) external nonpayable returns (uint256 shareUsed, uint256 shareReturned)
```

Calculates the amount of token &#39;from&#39; needed to complete the swap (amountFrom), this should be less than or equal to amountFromMax. Withdraws &#39;amountFrom&#39; of token &#39;from&#39; from the BeachBar account for this swapper. Swaps it for exactly &#39;exactAmountTo&#39; of token &#39;to&#39;. Transfers the swapped tokens of &#39;to&#39; into the BeachBar using a plain ERC20 transfer. Transfers allocated, but unused &#39;from&#39; tokens within the BeachBar to &#39;refundTo&#39; (amountFromMax - amountFrom). Returns the amount of &#39;from&#39; tokens withdrawn from BeachBar (amountFrom). (The BeachBar skim function will be used by the caller to get the swapped funds).



#### Parameters

| Name | Type | Description |
|---|---|---|
| fromToken | contract IERC20 | undefined |
| fromTokenId | uint256 | undefined |
| toToken | contract IERC20 | undefined |
| toTokenId | uint256 | undefined |
| recipient | address | undefined |
| refundTo | address | undefined |
| shareFromSupplied | uint256 | undefined |
| shareToExact | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| shareUsed | uint256 | undefined |
| shareReturned | uint256 | undefined |




