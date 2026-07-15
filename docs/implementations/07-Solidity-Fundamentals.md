# 07 — Solidity Fundamentals

Solidity contracts are programs deployed to the EVM. Their state and code are public, calls can be made by anyone, and successful state changes are generally irreversible. BatchPay therefore treats every external input as untrusted.

`msg.sender` is the immediate caller. In `airdropERC20`, it identifies the token owner whose allowance will be consumed; no owner variable or role system is required. `external` makes the public function callable through an ABI transaction. `address` identifies an account or contract. `uint256` stores non-negative token quantities in base units.

The contract uses `calldata` for its input arrays. Calldata is immutable transaction input and avoids copying arrays into memory, which is appropriate because BatchPay only reads them. The loop counter and accumulated total are local values. Solidity 0.8.x automatically reverts on arithmetic overflow, so `totalAmount += amounts[i]` cannot silently wrap.

Custom errors encode failure selectors and optional data more cheaply than revert strings. Events write searchable logs but do not enforce state; they support user interfaces and indexers after a distribution succeeds.

An external call—such as a token `transferFrom`—may revert or execute arbitrary code. This is why contract design must define validation order, atomicity, and token compatibility before implementation. Chapter 08 introduces the specific token protocol used here.

## Storage, memory, and calldata

EVM storage is persistent contract state and is expensive to write. BatchPay intentionally has no storage variables: it needs no per-user balance, owner address, recipient database, or payment queue. This reduces both cost and the number of states a reviewer must reason about.

Memory exists only for the duration of a call. Tests build recipient and amount arrays in memory because the test contract constructs them before making an external call. The production function receives the ABI-decoded arguments as calldata. Calldata is read-only and normally cheaper for external function inputs, so `address[] calldata` and `uint256[] calldata` are the appropriate interface types.

An array has a length and zero-based indexes. Accessing `amounts[i]` when `i` is outside its length reverts, which is why BatchPay validates equal lengths before entering its loop. The loop condition uses `i < recipients.length`; it visits every recipient exactly once for a well-formed input.

## Visibility and value flow

`external` functions are intended for calls from other accounts or contracts. The BatchPay entry point is permissionless: anyone may request a distribution, but its use of `msg.sender` means it only attempts to spend the caller's allowance. The function is not marked `payable`, so it cannot receive native ETH alongside the call. That aligns with the product boundary of ERC-20-only transfers.

`address(0)` is conventionally an invalid destination. Sending assets to it commonly makes them unrecoverable, so the contract explicitly rejects a zero token address and zero recipients. Solidity will allow a zero address at the type level; application policy must supply the semantic rule.

## Events are not state

`event Airdropped(...)` writes a log when the transaction succeeds. Logs are valuable because wallets, explorers, and indexers can filter indexed topics such as sender and token. They cannot be read by another contract as authoritative EVM state, and emitting one does not make a payment happen. The token's own state transition and `Transfer` log carry the actual transfer information. BatchPay emits a compact distribution-level summary to complement, not duplicate, those logs.

## Practical language discipline

Use explicit units such as `100 ether` in tests only as a convenient way to express `100 * 10^18` base units. It does not mean the mock token is ETH; the mock uses the ERC-20 default of 18 decimals. Production UI code must use the selected token's decimals rather than assuming 18. Solidity’s type safety helps, but it cannot distinguish two unrelated 18-decimal tokens or determine whether a token address is legitimate.
