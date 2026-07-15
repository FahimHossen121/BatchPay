# 08 — ERC-20 Standard

ERC-20 defines a common interface for fungible tokens. The relevant state is a balance mapping and an allowance mapping. A holder calls `approve(spender, amount)`; later, the spender calls `transferFrom(holder, recipient, amount)`. The token, not BatchPay, checks balance and remaining allowance and updates its own state.

```text
allowance[holder][BatchPay] = approved amount
BatchPay → token.transferFrom(holder, recipient, amount)
```

That model preserves non-custody: BatchPay never first receives the aggregate amount and never has a stored user balance. It invokes direct holder-to-recipient token transfers within one transaction. If any call reverts, EVM transaction atomicity rolls back earlier transfers and the BatchPay event.

BatchPay imports OpenZeppelin `IERC20` for the interface and `SafeERC20` for calls. `SafeERC20.safeTransferFrom` safely handles compliant tokens that return no Boolean value, a historical real-world deviation. It does not make arbitrary tokens safe. Fee-on-transfer and rebasing tokens are unsupported in v1 because the specified amount may not equal a recipient’s observed balance change.

Amounts are integer base units. A UI obtains `decimals()` for display and converts user input before calling the contract; the contract must receive integers only. The current contract permits zero-value entries: this is harmless but may waste gas. It does not deduplicate recipients; repeated addresses receive the sum of their entries.

## Allowance lifecycle

An allowance is keyed by owner and spender. It is not a general permission for all applications, and it is not transferred with a token balance. BatchPay's spender address is the deployed BatchPay contract—not the frontend URL, wallet extension, or token contract. The frontend should read:

```text
allowance(userAddress, batchPayAddress)
balanceOf(userAddress)
```

and compare both values with the integer sum of the selected distribution. When the allowance is too low, request approval. When it is sufficient, do not request another approval. A user can later reduce allowance with a token's `approve` method, subject to the token's own behavior.

Some tokens require setting a nonzero allowance to zero before replacing it due to historical ERC-20 approval-race semantics. The frontend should be prepared to explain and handle that token-specific flow rather than assuming every token accepts a single replacement approval. BatchPay itself does not call `approve`, so it does not need to encode this policy.

## Compatibility is a policy, not a label

Calling a contract `IERC20` only asserts that the caller will use an expected ABI; it cannot prove the bytecode is honest or standards-compliant. A malicious token can return misleading metadata, charge fees, blacklist an address, reenter through unusual code paths, or revert selectively. `SafeERC20` checks the success of low-level calls and accepts both properly returned true values and missing return data, but it cannot turn a malicious economic rule into a normal token.

BatchPay v1 supports ordinary fungible ERC-20 behavior. Fee-on-transfer tokens may deliver less than `amounts[i]`; rebasing tokens may change observed balances independently of distribution; and tokens with hooks or transfer restrictions can fail in ways BatchPay cannot predict. The frontend must disclose this before a user chooses such a token. A production token allowlist would be a product policy, not an on-chain validation requirement.

## Decimal conversion example

Suppose a token has 6 decimals and the user enters `12.5`. The exact contract amount is `12_500_000`, not a JavaScript floating-point representation. The frontend should parse decimal text using an integer-safe library, reject more than six fractional digits, and display the same normalized amount on the review screen. Solidity receives only `uint256`; it cannot recover what the user typed or correct a client-side rounding mistake.
