# Smart Contract Design Document — BatchPay

**Version:** 1.0
**Status:** Draft
**Depends on:** PRD v1.0, Architecture v1.0

## 1. Purpose

This document defines the public interface, behavior, and validation rules of the BatchPay smart contract for v1. It records the key design decisions and the reasoning behind them, so future changes (e.g., a gas-optimized v2) can be evaluated against a known baseline rather than guessed at.

## 2. Design Decisions (v1)

### 2.1 Function signature — no `totalAmount` parameter
`airdropERC20` takes `(token, recipients, amounts)` — three parameters, not four.

**Reasoning:** A caller-supplied `totalAmount` only pays for itself if the contract's transfer pattern can use it to avoid redundant on-chain work (e.g., pulling the full sum once instead of per-recipient). Since v1 uses direct per-recipient `transferFrom` (see 2.2), there is no such benefit — the contract must sum `amounts` on-chain regardless to know how much each recipient receives, and a caller-supplied total would just be extra calldata that still needs on-chain verification. Simpler interface, same security, no wasted parameter.

**Revisit condition:** If a future gas-optimized variant (v2) changes the transfer pattern such that a pre-verified total avoids real on-chain work, re-evaluate this decision then — not before.

### 2.2 Transfer pattern — direct `transferFrom`, no intermediate custody
The contract calls `transferFrom(sender, recipient, amount)` once per recipient. Tokens move directly from the sender's wallet to each recipient. The BatchPay contract never holds a token balance at any point, even momentarily within the transaction.

**Reasoning:** This is the strongest possible statement of the PRD's non-custody requirement — not "we don't hold funds across transactions" but "we never hold funds, period." It is also the simplest pattern to audit: there is no internal balance state to reason about, no additional re-entrancy surface introduced by the contract itself holding a balance mid-transaction.

**Tradeoff accepted:** This is not the maximally gas-efficient pattern possible (a pull-once-then-distribute pattern, or a Huff-level optimization, could be cheaper). We are deliberately trading some gas efficiency for auditability and the strongest trust story, consistent with the PRD's stated priority: "correctness over features" and "trust and non-custody" as non-negotiable requirements.

**Revisit condition:** After v1 is correct and fully tested, build a v2 variant using a different pattern and gas-benchmark it against v1. Only adopt v2 if the gas savings are significant enough to justify the added complexity and re-audit.

### 2.3 Token compatibility — OpenZeppelin `SafeERC20`, standard tokens only
The contract uses OpenZeppelin's `SafeERC20` library for all token interactions (`safeTransferFrom` instead of raw `transferFrom`).

**Reasoning:** Some deployed ERC20 tokens (e.g., USDT on mainnet) don't strictly follow the standard — they don't return a `bool` from `transfer`/`transferFrom`. A raw `transferFrom` call against such a token can behave unpredictably depending on how the calling code checks the return value. `SafeERC20` handles this correctly and is the industry-standard way to do it.

**Explicitly out of scope for v1:** Fee-on-transfer tokens (recipient receives less than `amounts[i]` specifies) and rebasing tokens (balances change outside of transfers) are not specially handled. The contract will not detect or compensate for these — behavior with such tokens is undefined and unsupported. This limitation must be surfaced to users in the frontend, not just buried in this document.

### 2.4 Recipient list size — no on-chain cap
The contract does not enforce a maximum `recipients.length`.

**Reasoning:** Any cap would be an arbitrary number disconnected from actual network conditions (block gas limits vary, and what's "too large" depends on the token's own gas cost per transfer, which the contract can't know in advance). Enforcing a cap doesn't prevent bad UX — it just moves the failure to a different, equally arbitrary line.

**How the failure mode is actually handled:** The frontend is responsible for estimating gas before the user signs and warning them if a submission is likely to exceed the block gas limit. This keeps the contract simple and general-purpose while keeping the *user-facing* experience safe.

**Known, accepted limitation:** Because there's no on-chain cap, someone could bypass the frontend entirely and call the contract directly with an oversized array. This is not a fund-safety issue — the transaction simply reverts (out of gas), wasting only the caller's own gas. It is recorded here as a deliberate, accepted tradeoff, not an oversight.

## 3. Public Interface

```
function airdropERC20(
    address token,
    address[] calldata recipients,
    uint256[] calldata amounts
) external
```

Behavior: for each `i`, transfers `amounts[i]` of `token` from `msg.sender` to `recipients[i]`, using `SafeERC20.safeTransferFrom`. Reverts entirely (no partial execution) if any validation check or any individual transfer fails.

## 4. Validation Rules

The contract must independently enforce all of the following, regardless of what the frontend already checked (per the Architecture doc's trust-boundary principle — the frontend's validation is UX convenience, not a security control):

| Check | Rule |
|---|---|
| Array lengths match | `recipients.length == amounts.length` |
| Non-empty | `recipients.length > 0` |
| No zero address recipient | `recipients[i] != address(0)` for all `i` |
| No zero token address | `token != address(0)` |
| Sender has sufficient balance | Implicitly enforced by `transferFrom` reverting |
| Sender has sufficient allowance | Implicitly enforced by `transferFrom` reverting |

Open question carried forward: should a zero-amount entry (`amounts[i] == 0`) be rejected, or allowed as a harmless no-op? Leaning toward **allowed** (simpler, not a security issue, and rejecting it adds a check with no real benefit) — to be confirmed during implementation.

## 5. Events

```
event Airdropped(
    address indexed sender,
    address indexed token,
    uint256 recipientCount,
    uint256 totalAmount
);
```

**Reasoning:** Even though the contract doesn't require a caller-supplied `totalAmount`, it's still useful to emit the computed total in the event — this is what lets the frontend (and any future indexer/explorer) reconstruct distribution history without re-deriving it from individual `Transfer` events. Emitting one event per distribution (not per recipient) keeps logs cheap; per-recipient detail is already available via the ERC20 contract's own `Transfer` events, which fire naturally as a side effect of each `transferFrom` call.

## 6. Errors

Custom errors (cheaper than `require` strings) for each validation rule in Section 4, e.g.:

```
error ArrayLengthMismatch();
error EmptyRecipientList();
error ZeroAddressRecipient();
error ZeroAddressToken();
```

## 7. Explicit Non-Goals for the Contract (v1)

Carried forward from the PRD/Architecture docs, restated at the contract level for clarity during implementation:
- No native ETH transfers.
- No NFT (ERC721/ERC1155) support.
- No access control / ownership (the contract has no privileged functions — it is a pure relay, callable by anyone, for their own tokens only).
- No pause mechanism, no upgradability — v1 is a simple, immutable contract by design, consistent with minimizing trust assumptions.

## 9. Gas Benchmark (updated, optimizer enabled)

Original benchmark figures in earlier revisions of this document were measured before `solc_version` was pinned and the optimizer was enabled in `foundry.toml` (see Security.md changelog, and the independent audit that flagged this gap). Current, reproducible figures — Solc 0.8.35, `optimizer = true`, `optimizer_runs = 200`:

| Recipients | Gas |
|---|---|
| 1 | 58,400 |
| 5 | 174,437 |
| 10 | 319,603 |
| 50 | 1,480,874 |

Marginal cost per recipient is approximately 28,900 gas, with roughly 29,500 gas fixed overhead per call — both meaningfully lower than the pre-optimization baseline (~31,560/recipient, ~31,500 fixed). This is the current baseline for comparing any future gas-optimized (v2) variant.

## 10. Next Steps (completed items retained for history)

1. ✅ Write the contract (`src/BatchPay.sol`) implementing exactly this interface.
2. ✅ Write unit tests for each validation rule (one test per revert condition).
3. ✅ Write a happy-path test (multiple recipients, correct balances after).
4. ✅ Write fuzz tests for array lengths / amounts.
5. ✅ Gas-benchmark the happy path as a baseline (see Section 9, updated post-optimizer-fix).