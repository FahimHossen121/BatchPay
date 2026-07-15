# 13 — Reverts and Custom Errors

A revert aborts the current EVM transaction and rolls back all state changes made during it. That is essential for BatchPay: if the third transfer in a batch fails, the first two must not remain paid.

The contract uses custom errors instead of `require(..., "text")`:

```solidity
error ArrayLengthMismatch();
if (recipients.length != amounts.length) revert ArrayLengthMismatch();
```

Custom errors express a machine-decodable failure selector and avoid embedding long strings in deployed bytecode. They also make tests exact. Use `require` for ordinary condition checks when a string is genuinely helpful; use `assert` only for internal invariants that should be impossible to violate, not for user input.

BatchPay separates responsibility for errors. It owns structural validation—zero addresses, empty recipient list, array mismatch. The token owns its balance, allowance, pause, blacklist, and other token-specific rules. Wrapping every token failure in a BatchPay error would obscure useful information and create an incomplete imitation of token semantics.

Frontend validation should describe likely failures before signing, but it must never be treated as a substitute for a revert. Anyone can call the contract without using the frontend.

## A failure taxonomy for BatchPay

There are three useful categories of failure. First, caller-shape errors are deterministic BatchPay errors: zero token, no recipients, unequal lists, or a zero recipient. The frontend can detect these early, the contract must enforce them, and tests should match their selectors exactly.

Second, token authorization and accounting errors originate at the ERC-20 contract. Insufficient balance, insufficient allowance, a paused token, a blacklist, or a fee policy are not BatchPay's rules. The caller sees a reverted BatchPay transaction because the external call reverted, but the diagnostic may belong to the token. The UI should translate common cases without promising that it can classify every third-party token error.

Third, environmental failures occur outside EVM business logic: the user rejects a wallet prompt, the RPC times out, the selected chain changes, or gas estimation fails. These may not create an on-chain transaction at all. Treating every failure as a generic “transaction failed” deprives a user of the action they need to take.

## Validation and recovery

Validation costs gas when submitted on-chain, but it is cheaper than an ambiguous or unsafe outcome. Put inexpensive global checks before the loop. Checking recipient addresses inside the loop is unavoidable because they are per-entry data. Avoid a preflight loop solely to validate all recipients followed by a second transfer loop unless a concrete security requirement justifies the extra cost.

Custom errors can later carry context where that makes recovery better, for example `error ZeroAddressRecipient(uint256 index)`. The current design uses parameterless errors, which keeps the interface small. Changing it affects tests and frontend decoding, so make such a decision deliberately.

A reverted distribution needs no on-chain rollback action: the EVM has already rolled it back. The user may need to fix input, increase approval, choose a supported token, reduce batch size, or retry under different network conditions. The frontend should retain the local list after a revert, but must not imply that a failed transaction partially succeeded without examining the confirmed chain result.
