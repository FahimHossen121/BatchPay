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

## 6. Re-entrancy Analysis — VERIFIED

**Status: verified via adversarial test (`test_ReentrancyAttempt_RevertsEntireTransaction`), passing.**

Tested with a malicious `ReentrantERC20` mock whose `transferFrom` attempts to call back into `airdropERC20` mid-transfer, trying to trigger a second nested distribution before the first completes.

**Finding:** the attack structurally cannot succeed, for a specific reason worth recording precisely. When the malicious token's `transferFrom` re-enters `airdropERC20`, the reentrant call's `msg.sender` is the *token contract itself* (Solidity does not allow a contract to spoof `msg.sender` on an outgoing call — it is always the actual caller). Since BatchPay always sources funds from `msg.sender`, the reentrant call can only ever attempt to pull funds "as the token contract," which never has any allowance of its own. The nested call reverts on insufficient allowance, which propagates up and reverts the entire outer transaction (Solidity's default unhandled-external-call-failure behavior). Confirmed empirically: after the attack attempt, `alice`'s and `sender`'s balances are unchanged — full atomicity held, no partial state.

**Why this holds in general, not just for this test case:** the property isn't "this particular attack failed" — it's that BatchPay's use of `msg.sender` as the sole funds source means a reentrant call from within a malicious token can never impersonate the original caller. Classic reentrancy exploits rely on being able to act as the victim; that avenue is structurally unavailable here regardless of what the malicious token's code does. Combined with the contract holding no storage state at all, there is no state to corrupt and no way to spend someone else's allowance via re-entrancy.

**Residual risk (not fund-safety, worth noting):** a malicious or non-standard token whose `transferFrom` always attempts something like this would cause its *own* distributions to always revert. This only harms users who choose to distribute that specific malicious token — it has no effect on BatchPay's safety for other tokens or other users. Filed as a known limitation, not a vulnerability.

## 7. Open Items / Follow-Up Test Coverage Needed

- [x] Adversarial test: a malicious ERC20 mock that attempts re-entrancy during `transferFrom` — verified, see Section 6.
- [ ] Test behavior against a fee-on-transfer mock token — confirm it doesn't fail in a fund-unsafe way (reverting is fine; silently misreporting amounts is not).
- [ ] Decide whether `amounts[i] == 0` handling needs an explicit test (currently implicitly covered by fuzzing, but no dedicated named test asserts this behavior).
- [ ] Consider whether the `Airdropped` event's `totalAmount` should be documented as "amount authorized," not "amount received," given Section 5's limitations.
- [ ] Before any mainnet deployment: revisit Section 4's "no pause/upgrade" tradeoff explicitly and confirm it's still the right call given whatever real funds will be at stake.

## 8. Change Log

- **v1.0** — Initial pass, written after test suite completion (12 tests: happy path, 4 validation reverts, 2 implicit-enforcement reverts, fuzz, gas benchmarks). No adversarial/malicious-token testing performed yet.
- **v1.1** — Added adversarial re-entrancy test (13th test). Section 6 upgraded from "unverified" to "verified": confirmed the contract's `msg.sender`-sourced funding model structurally prevents a malicious token from impersonating the original caller via re-entrancy, so any such attempt reverts the whole transaction atomically rather than corrupting state or leaking funds.