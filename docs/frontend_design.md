# Frontend Design Document — BatchPay

**Version:** 1.0
**Status:** Draft
**Depends on:** PRD v1.0, Architecture v1.0, Smart Contract Design v1.0, Security v1.1

## 1. Purpose

This document defines the frontend's screens, states, and interaction flow, grounded in the actual deployed `BatchPay.airdropERC20(address token, address[] recipients, uint256[] amounts)` interface — not a hypothetical one. It does not cover component-level code structure; that's implementation detail decided while building.

## 2. Scope Reminder (from PRD)

Per the PRD's non-goals, this is a single-flow application: connect wallet → pick token → enter recipients/amounts → approve → distribute. No accounts, no saved history, no multi-token flows in v1.

## 3. Screen / State Map

There is effectively one screen with sequential states, not multiple routes:

```
[Not Connected]
      │  connect wallet
      ▼
[Connected, No Token Selected]
      │  enter token address
      ▼
[Token Loading] ──(invalid/not a token)──▶ [Token Error]
      │  success
      ▼
[Token Loaded — Form Active]
      │  enter recipients + amounts
      ▼
[Preview Ready] ◀── validation errors loop back here
      │  user clicks "Approve"
      ▼
[Approval Pending] ──(rejected/failed)──▶ [Approval Error]
      │  confirmed
      ▼
[Ready to Distribute]
      │  user clicks "Send"
      ▼
[Distribution Pending] ──(rejected/failed)──▶ [Distribution Error]
      │  confirmed
      ▼
[Success]
```

Each state should have an obvious, distinct visual treatment — the user should never wonder "did my click register?" during either pending state, since these correspond to real wallet prompts and real block confirmations, which can take a few seconds.

## 4. Required On-Chain Reads

Before any transaction is offered, the frontend needs to read (via Wagmi):

| Data | Source | Why |
|---|---|---|
| Token `name`, `symbol`, `decimals` | ERC20 token contract (standard `IERC20Metadata` calls) | Confirms to the user which token they're about to send — critical trust signal per PRD §6, step 4 |
| Current allowance (`allowance(user, BatchPay)`) | ERC20 token contract | Determines whether the Approve step can be skipped if a sufficient allowance already exists |
| Connected wallet's balance of the token | ERC20 token contract | Lets the frontend warn *before* signing if the user doesn't hold enough, rather than letting the transaction revert |

None of these reads are used for fund-safety enforcement — per the Architecture doc's trust boundaries, the contract independently re-validates everything. These reads exist purely to inform the user and prevent avoidable failed transactions.

## 5. Input Handling

### Token address
- Free-text input. On a valid-looking address, attempt the metadata reads (Section 4). If any revert or return unexpected data, show a clear "this doesn't look like a valid ERC20 token" state rather than a raw error.

### Recipients and amounts
- **Two supported input modes, user's choice via a toggle:**
  1. **Paired mode** — two separate text areas, one for recipients (newline/comma-separated) and one for matching amounts, in the same order. Simple, matches the original course reference material.
  2. **Combined mode** — a single text area, one entry per line in `address,amount` format (e.g., `0xABC...,5.5`). Faster for pasting from a spreadsheet or existing list.
- Both modes parse down to the exact same internal `recipients[]` / `amounts[]` pair before validation — the rest of the flow (Section 5's validation rules, the preview in Section 6) doesn't need to know which mode was used. This keeps the two input modes purely a UI-layer concern, not a duplicated validation/preview path.
- Switching modes mid-entry should warn if it would discard unsaved input, rather than silently clearing the form.
- Client-side validation before anything reaches a wallet prompt:
  - Recipients list is non-empty.
  - Every entry parses as a valid Ethereum address.
  - Amounts list has the same length as recipients.
  - Every amount parses as a valid positive number (input in human-readable token units, e.g., "5.5", then converted to the token's raw integer units using its `decimals` — this conversion is a common source of bugs and deserves care and its own dedicated tests).
- All of this mirrors the contract's own validation (Smart Contract Design §4) deliberately — the frontend should catch what the contract will also catch, so the user never wastes a transaction fee discovering a mistake the frontend could have caught for free.

### Preview
- Once inputs pass validation, show: recipient count, total amount (in both raw units and human-readable form), and the token identity confirmed in Section 4. This directly satisfies PRD §6, step 6 — nothing should be signed without this being visible first.

## 6. Transaction Flow — Two Signatures, Clearly Distinguished

Per Architecture §4 and Smart Contract Design §2.2, two separate signatures are structurally required: `approve` (on the token contract) and `airdropERC20` (on BatchPay). The frontend's most important job in this whole flow is making that two-step nature legible rather than confusing — Architecture §6 flags this as a known confusion point and phishing look-alike vector.

Concretely:
- Label the two steps explicitly and sequentially in the UI (e.g., "Step 1 of 2: Approve" / "Step 2 of 2: Send"), not as a single ambiguous "Submit" button.
- If an existing allowance already covers the required total (Section 4's allowance read), skip straight to Step 2 and say so explicitly ("Already approved — ready to send") rather than silently hiding the skipped step, so the user understands why they're only being asked to sign once.
- Never let the user reach the distribute step without a fresh, accurate preview matching what they're about to sign — if they edit inputs after approving, invalidate the preview and require re-confirmation.

### Suggested concrete treatment

A persistent two-step tracker above the action button, visible throughout: `① Approve ── ② Send Tokens`, with the inactive step greyed out until reachable.

**The core principle for every button label and status line: name the specific amount, token, and recipient count — never a generic "Approve" / "Submit."** This specificity is the actual defense against the phishing-lookalike confusion Architecture §6 flags, more than any visual styling choice.

| State | Button label | Supporting text |
|---|---|---|
| Ready to approve | `Approve 1,000 MOCK` | "You'll sign two transactions: one to authorize BatchPay to spend your tokens, one to send them. Nothing is sent until step 2." |
| Allowance already sufficient | *(step 1 shows a checkmark, not hidden)* | "Already approved" |
| Approval pending | `Waiting for approval...` (disabled, spinner) | "Confirm in your wallet" — covers the common case of the wallet popup being hidden behind the browser |
| Ready to send | `Send to 12 recipients` | Full preview (count + total) stays visible above the button, not scrolled away |
| Distribution pending | `Sending...` (disabled, spinner) | "Confirm in your wallet" |
| Success | Action area replaced entirely | "Sent 1,000 MOCK to 12 recipients" + block explorer link (testnet+ only; not available against local Anvil) |
| Rejected/error | Form stays intact, not reset | Failed step marked with a retry button + plain-language error per Section 7's table |

## 7. Error Handling Philosophy

Every failure state (Section 3) needs to answer, in plain language: **what happened, and what should the user do now?** Concretely:

| Failure | User-facing message approach |
|---|---|
| Wallet rejects a signature | Neutral, no blame — "Transaction was not signed. You can try again when ready." |
| Approve/distribute reverts on-chain | Translate known contract errors (Smart Contract Design §6 custom errors) into plain language where feasible, rather than showing raw revert data |
| Insufficient allowance/balance mid-flow (e.g., balance changed between page load and submission) | Explicit, specific message — this is exactly the implicit-failure case verified in Security.md §3, so the frontend should anticipate it, not treat it as a mystery error |
| Network mismatch (wallet on wrong chain) | Caught and blocked *before* reaching a wallet prompt, with a one-click "switch network" action, per Architecture §6 |

## 8. Explicit Non-Goals (v1 Frontend)

Consistent with the PRD:
- No recipient list save/reuse across sessions.
- No CSV import.
- No ENS resolution.
- No transaction history view beyond the current session's success/failure state.
- No support for tokens the frontend can't read standard metadata from (Security.md §5's non-standard token limitation must be surfaced here, not silently ignored — see Section 9).

## 9. Known Limitation to Surface to Users

Per Security.md §5, fee-on-transfer and rebasing tokens are unsupported and untested. The frontend should carry a visible, plain-language notice (not buried in fine print) that non-standard tokens may not behave as expected — this is a direct product responsibility flowing from a backend limitation, not optional polish.

## 10. Next Steps

1. Scaffold the Next.js project (React + TypeScript + Wagmi + RainbowKit, per the original technology stack decision).
2. Wire up wallet connection and network detection first, in isolation, before any contract-specific logic — get the "boring" plumbing working and verified before layering in BatchPay-specific reads/writes.
3. Implement token metadata reading against the local Anvil deployment (Section 4).
4. Build the recipient/amount input and validation (Section 5).
5. Implement the two-step transaction flow (Section 6), tested against Anvil first, before ever touching a public testnet.