# Security Review — BatchPay

**Version:** 1.0 (living document — update as the project evolves)
**Status:** Initial pass, post-implementation
**Scope:** `src/BatchPay.sol` as implemented and tested (15 passing tests: happy path, 4 validation reverts, 2 implicit ERC20-enforcement reverts, fuzz, gas benchmarks, 2 adversarial re-entrancy tests, 1 atomicity/rollback test)

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

## 6. Re-entrancy Analysis — VERIFIED (corrected)

**Status: verified via two adversarial tests** (`test_ReentrancyAttempt_RevertsEntireTransaction`, `test_ReentrancyAttempt_CannotAccessOriginalSendersFunds`), both passing.

**Correction note:** an earlier version of this section overstated the finding, claiming re-entrant calls "always revert" because a malicious token has no allowance of its own. An independent audit correctly identified this as false: a malicious token can self-approve (`_approve(address(this), spender, amount)`) using its own internal logic, granting BatchPay an allowance over the *token contract's own balance* before re-entering. This means a reentrant call to `airdropERC20` can genuinely succeed — it does not always revert. The section below states the corrected, precisely verified invariant.

**The actual, correct invariant:** BatchPay always sources a transfer from `msg.sender` of the call it is currently executing. In a reentrant call triggered from inside a malicious token's `transferFrom`, `msg.sender` for that nested call is the token contract itself — Solidity does not allow a contract to spoof `msg.sender` on an outgoing call. This means:

- A malicious token **can** successfully move its own funds via a reentrant `airdropERC20` call, if it grants itself an allowance first (proven by `test_ReentrancyAttempt_CannotAccessOriginalSendersFunds`).
- A malicious token **cannot**, under any circumstance found or constructed, cause funds to move from the *original* caller (`sender`) as a result of that reentrant call. The original caller's balance and allowance are only ever touched by the outer call that they themselves signed — verified explicitly by asserting `sender`'s allowance only decreases by the outer call's amount, never by the nested call's amount.
- Additionally, if the malicious token does *not* self-approve, the reentrant call simply reverts on insufficient allowance, which reverts the entire outer transaction atomically — no partial state (verified by `test_ReentrancyAttempt_RevertsEntireTransaction`).

**Why this holds in general:** the property is not "reentrant calls fail" — it's that reentrant calls can only ever act *as the token contract itself*, never as the original caller, because BatchPay has no mechanism to attribute a nested call's funding source to anyone other than that nested call's actual `msg.sender`. Combined with BatchPay holding no mutable storage state at all, there is no state to corrupt and no way for a reentrant call to spend someone else's allowance, regardless of what the malicious token's own logic does internally.

**Residual risk (not fund-safety, worth noting):** a malicious token could use reentrancy to manipulate its own internal accounting in ways relevant to itself (e.g., distributing its own held balance in unexpected ways), but this has no effect on BatchPay's safety, on other tokens, or on other users' funds.

## 7. Open Items / Follow-Up Test Coverage Needed

- [x] Adversarial test: a malicious ERC20 mock that attempts re-entrancy during `transferFrom` — verified, see Section 6 (corrected via independent audit finding — see Section 8's v1.2 entry).
- [x] Atomic rollback test: confirm a later recipient's failed transfer reverts the entire batch, including earlier successful transfers within the same call — verified via `test_RevertWhen_LaterRecipientTransferFails_RevertsEntireBatch`, see Section 8's v1.3 entry.
- [ ] Test behavior against a fee-on-transfer mock token — confirm it doesn't fail in a fund-unsafe way (reverting is fine; silently misreporting amounts is not). Note: this is a known, documented v1 scope cut (Section 5), not a newly discovered gap — but remains untested.
- [ ] Decide whether `amounts[i] == 0` handling needs an explicit test (currently implicitly covered by fuzzing, but no dedicated named test asserts this behavior).
- [ ] Consider whether the `Airdropped` event's `totalAmount` should be documented as "amount authorized," not "amount received," given Section 5's limitations.
- [ ] Before any mainnet deployment: revisit Section 4's "no pause/upgrade" tradeoff explicitly and confirm it's still the right call given whatever real funds will be at stake.

## 8. Change Log

- **v1.0** — Initial pass, written after test suite completion (12 tests: happy path, 4 validation reverts, 2 implicit-enforcement reverts, fuzz, gas benchmarks). No adversarial/malicious-token testing performed yet.
- **v1.1** — Added adversarial re-entrancy test (13th test). Section 6 upgraded from "unverified" to "verified": confirmed the contract's `msg.sender`-sourced funding model structurally prevents a malicious token from impersonating the original caller via re-entrancy, so any such attempt reverts the whole transaction atomically rather than corrupting state or leaking funds.
- **v1.2** — Independent audit correctly identified that v1.1's claim ("re-entrant calls always revert") was overstated: a malicious token can self-approve and successfully complete a reentrant call using its own funds. Added a second adversarial test (`test_ReentrancyAttempt_CannotAccessOriginalSendersFunds`, 14th test) using a self-approving malicious token, and rewrote Section 6 to state the precise, correct invariant — reentrant calls can succeed, but can never move the original caller's funds, only the malicious token's own self-approved balance. The practical security conclusion (no fund loss, no state corruption for legitimate users) is unchanged; the stated reasoning behind it is now accurate.