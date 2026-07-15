# Security Review — BatchPay

**Version:** 1.0 (living document — update as the project evolves)
**Status:** Initial pass, post-implementation
**Scope:** `src/BatchPay.sol` as implemented and tested (12 passing tests: happy path, 4 validation reverts, 2 implicit ERC20-enforcement reverts, fuzz, gas benchmarks)

## 1. Purpose

This document records BatchPay's trust assumptions, threat model, and known limitations, and tracks what has and hasn't been verified. Unlike the other design docs, this one is expected to keep changing — every new test, every edge case found, every design revisit should be reflected here.

## 2. Trust Model

| Actor | Trusted for | Not trusted for |
|---|---|---|
| `msg.sender` (caller) | Only ever spending their own tokens | Anything else — all inputs are validated on-chain, never assumed correct because the frontend checked them |
| ERC20 token contract | Standard `transferFrom`/`approve` semantics, when the token is well-behaved | Being non-standard (fee-on-transfer, rebasing) without unexpected side effects — see Section 5 |
| Frontend | UX-level convenience validation | Any fund-safety guarantee — per the Architecture doc, the contract must independently enforce everything that matters |
| BatchPay contract itself | — | Never holds a token balance; has no owner, no privileged role, no upgrade path (see Smart Contract Design §7) |

Core invariant the whole design rests on: **BatchPay never custodies funds, even momentarily, within a transaction.** Every transfer is `sender → recipient` directly via `transferFrom`. This has been true since Decision 2.2 and is the property most future changes should be checked against before being adopted.

## 3. Verified Properties (covered by current test suite)

- Tokens move only from `msg.sender` to the specified recipients, in the specified amounts (happy path + fuzz).
- Zero token address is rejected.
- Empty recipient list is rejected.
- Mismatched `recipients`/`amounts` lengths are rejected.
- Zero-address recipients are rejected.
- Insufficient allowance causes the whole call to revert (no partial execution).
- Insufficient balance causes the whole call to revert (no partial execution).
- Behavior holds across randomized recipient counts (1–50) and randomized amounts (fuzzed, 256 runs).
- Gas cost scales linearly with recipient count (~31,560 gas marginal cost per recipient, ~31,500 fixed overhead per call) — no anomalous scaling behavior observed.

## 4. Known Design Tradeoffs (accepted, not oversights)

These are deliberate decisions from the Smart Contract Design doc, restated here from a security lens:

- **No on-chain cap on recipient list size.** Someone bypassing the frontend could submit an array large enough to exceed the block gas limit. Impact: the transaction simply reverts (out of gas) — the caller wastes only their own gas. Not a fund-safety issue. Accepted.
- **`amounts[i] == 0` is allowed, not rejected.** A harmless no-op transfer. Not a fund-safety issue. Accepted.
- **No access control, no pause, no upgradability.** By design — this minimizes trust assumptions (no admin key to compromise, no upgrade path to hijack) at the cost of being unable to patch a bug post-deployment without deploying a new contract entirely. This is a real tradeoff worth re-confirming deliberately before mainnet deployment, not just inheriting by default.

## 5. Known Limitations — Non-Standard Tokens

Per Smart Contract Design §2.3, `SafeERC20` handles non-bool-returning tokens (e.g., USDT-style), but the following are explicitly **unsupported and untested**:

- **Fee-on-transfer tokens** — if a token takes a cut on transfer, the recipient receives less than `amounts[i]` specifies, but the contract's `Airdropped` event still reports the sender-specified `totalAmount`, which would then be inaccurate. Not caught by any current test.
- **Rebasing tokens** — balances that change outside of transfers could cause confusing but not fund-unsafe behavior (BatchPay doesn't hold balances between transactions, so rebasing during a distribution itself isn't a custody risk — but the UX implications are unverified).
- **Tokens with transfer hooks / callbacks** (e.g., ERC777-style tokens claiming ERC20 compatibility) — not analyzed. This is a candidate re-entrancy surface worth a dedicated look before considering it safe, since a malicious or unusual token could execute arbitrary code during `transferFrom`.

**Action item:** the frontend must clearly communicate this limitation to users before they select a token — this cannot be a purely backend-documented limitation, since the contract has no way to detect these token types itself.

## 6. Re-entrancy Analysis (preliminary)

The loop in `airdropERC20` makes an external call (`safeTransferFrom`) once per recipient, inside a loop, before the function completes. This is a standard "external call in a loop" pattern worth scrutinizing:

- Because BatchPay never holds a balance and has no state that could be exploited via re-entrancy (no storage variables at all, in fact — the contract is fully stateless besides events), a classic re-entrancy attack (drain contract balance via reentrant calls) has no target to hit. There's nothing to steal from BatchPay itself.
- However, if a malicious *token* contract were used (see Section 5, transfer hooks), a reentrant call back into `airdropERC20` itself, or into some other function, isn't currently analyzed for second-order effects (e.g., could a malicious token manipulate `msg.sender`'s own state in a way that affects a subsequent transfer within the same loop?). Given the contract's statelessness, this is currently believed low-risk, but "believed" is not "proven" — this needs a dedicated adversarial test with a malicious mock token before it can be marked verified.

**Status: unverified — flagged for follow-up, not yet tested.**

## 7. Open Items / Follow-Up Test Coverage Needed

- [ ] Adversarial test: a malicious ERC20 mock that attempts re-entrancy during `transferFrom`, to empirically confirm Section 6's reasoning.
- [ ] Test behavior against a fee-on-transfer mock token — confirm it doesn't fail in a fund-unsafe way (reverting is fine; silently misreporting amounts is not).
- [ ] Decide whether `amounts[i] == 0` handling needs an explicit test (currently implicitly covered by fuzzing, but no dedicated named test asserts this behavior).
- [ ] Consider whether the `Airdropped` event's `totalAmount` should be documented as "amount authorized," not "amount received," given Section 5's limitations.
- [ ] Before any mainnet deployment: revisit Section 4's "no pause/upgrade" tradeoff explicitly and confirm it's still the right call given whatever real funds will be at stake.

## 8. Change Log

- **v1.0** — Initial pass, written after test suite completion (12 tests: happy path, 4 validation reverts, 2 implicit-enforcement reverts, fuzz, gas benchmarks). No adversarial/malicious-token testing performed yet.