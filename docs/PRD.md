# Product Requirements Document (PRD)

**Product Name:** BatchPay (working name)
**Category:** Decentralized Application (dApp) — ERC20 Batch Token Distribution Protocol
**Version:** 1.0
**Status:** Draft — Planning Phase
**Document Owner:** Product

---

## 1. Executive Summary

BatchPay is a decentralized application that allows any holder of an ERC20 token to distribute that token to many wallet addresses in a single on-chain transaction, instead of sending one transaction per recipient.

The product consists of two coordinated pieces of engineering work — a smart contract layer and a web frontend — but from a product perspective it is a single experience: a user shows up with a token and a list of people to pay, and leaves having paid all of them, having spent less in gas and less time than any alternative available to them today.

This document defines *what* we are building and *why*. It intentionally excludes implementation details (contract functions, storage layout, frontend components, libraries) — those belong in separate engineering design documents that follow this one.

---

## 2. Problem Statement

Any individual, team, or protocol that owes the same ERC20 token to many different addresses today faces a bad set of options:

- Send transactions one at a time from a wallet UI — safe, but linearly expensive in gas and time, and error-prone at scale (typos, wrong amounts, lost track of who's been paid).
- Write custom scripts against an RPC endpoint — requires engineering resources most teams don't want to spend on a recurring operational task.
- Use a centralized service that takes custody of funds before distributing them — reintroduces the exact counterparty risk that using a blockchain was supposed to remove.

None of these are good defaults. The underlying task — "pay a known list of addresses a known list of amounts, in one token, right now" — is extremely common (payroll, grants, rewards, refunds, retroactive airdrops, bounty payouts) and does not need any of that overhead or risk.

There is a real gap for a tool that is non-custodial, cheap, fast to use, and trustworthy enough that a treasury or DAO would actually route real funds through it.

---

## 3. Product Vision

**Sending a token to a thousand people should feel like sending a token to one person.**

BatchPay's long-term vision is to become the default, trust-minimized rail for one-to-many token distribution across EVM chains — the layer that any wallet, DAO tool, or payroll product can point users to (or integrate directly) whenever the task is "send this token to this list of addresses."

In v1, we are not trying to be a platform, an SDK, or a multi-asset payments suite. We are trying to nail one job extremely well: a single person, holding an ERC20 token and a list of recipients, completes a batch transfer safely, cheaply, and with full confidence in what they're about to sign.

---

## 4. Goals

### Primary Goals (v1)
1. Let a user distribute one ERC20 token to many recipients in one blockchain transaction.
2. Make the cost of doing so meaningfully lower than the sum of individual transfers.
3. Never take custody of user funds at any point in the flow.
4. Give the user a clear, accurate preview of exactly what they are about to authorize before they sign anything.
5. Work with any standards-compliant ERC20 token, without requiring the token issuer to do anything special.

### Secondary Goals (v1)
6. Support the networks where our target users already hold and use tokens, not just Ethereum mainnet.
7. Keep the experience usable by someone who is comfortable with a crypto wallet but is not a developer.
8. Be transparent and auditable enough that a cautious treasury manager or DAO multisig signer would be willing to use it for real funds.

### Explicit Non-Goals (v1)
- We are not building a payroll/HR platform (recurring schedules, vesting, tax reporting, etc.).
- We are not supporting native chain currency (ETH, MATIC, etc.) transfers, or NFTs (ERC721/ERC1155).
- We are not building any account system, login, or off-chain user profile.
- We are not building an admin dashboard, analytics suite, or multi-user org features.
- We are not optimizing for anonymous/permissionless "claim" style airdrops (where recipients pull funds) — v1 is strictly sender-initiated push distribution.

Keeping v1 narrow is a deliberate product decision: a tool that does one thing with obvious correctness is more likely to earn the trust required for people to route real money through it than a tool that tries to do many things at launch.

---

## 5. Target Users

### Primary Persona — "The Distributor"
Someone who periodically owes the same token to a list of addresses and currently does this manually or via a script.
Examples: a DAO contributor lead paying contributor rewards, a founder paying advisors/early contributors in a project token, a community manager running a rewards round, a grants committee disbursing an approved batch of grants.

What they care about most: *not losing money to a mistake*, and *not paying more gas than they have to*. They are comfortable with a wallet (MetaMask or similar) and have done token transfers before, but are not necessarily technical.

### Secondary Persona — "The Builder"
A developer or small web3 team that needs this functionality inside their own product and would rather point users at (or eventually integrate) an existing, audited solution than build and maintain their own batch-transfer logic.

### Tertiary Persona — "The One-Off User"
Someone who only ever needs this once — e.g., splitting a refund among a small group, or paying out a one-time bounty round — and wants something they can use without setting up anything or trusting a middleman.

---

## 6. Core User Journey

1. User arrives at the application and connects an existing wallet.
2. User selects the network their token and recipients live on.
3. User specifies the ERC20 token they want to distribute.
4. The application confirms the token to the user in human-readable terms (what token this is, so they aren't about to send the wrong asset).
5. User provides the list of recipient addresses and the corresponding amount for each.
6. The application shows a clear summary: total recipients, total amount, in both raw and human-readable form, before anything is signed.
7. User authorizes the application to move the required amount of the token on their behalf.
8. User confirms the distribution itself.
9. User receives clear confirmation that the distribution succeeded (or a clear, actionable explanation if it did not).

At every step, the user should be able to tell *exactly* what they are about to authorize before they authorize it. This is a payments product; ambiguity at the moment of signing is the single biggest risk to user trust.

---

## 7. Functional Requirements

These describe required user-facing capability, not implementation.

**Must have (v1):**
- Connect a standard web3 wallet.
- Select among a defined set of supported networks.
- Specify an ERC20 token to distribute.
- Provide a list of recipients and matching amounts.
- See an accurate, human-readable preview of the total commitment before signing.
- Authorize the application to move funds, as a distinct and clearly-labeled step from the transfer itself.
- Execute the distribution to all recipients.
- See a clear success or failure state, including enough information to know what to do next if something failed.

**Should have (v1):**
- Reasonable input validation with actionable error messages (e.g., malformed address, mismatched list lengths) before the user is asked to sign anything.
- Support for large recipient lists without the experience degrading.

**Out of scope (v1), candidates for later:**
- Saving/reusing recipient lists across sessions.
- Human-readable name resolution for addresses (e.g., ENS).
- CSV import/export.
- Multi-token distributions in a single flow.
- Scheduling or recurring distributions.

---

## 8. Non-Functional Requirements

- **Trust & Non-Custody:** At no point should the product, its operators, or its infrastructure be in a position to take, redirect, or lose custody of user funds. This is the product's core trust proposition and is non-negotiable.
- **Correctness over features:** Given a choice between shipping a feature and being certain the existing feature set is correct, correctness wins. Mistakes in this product move real money and are typically irreversible.
- **Cost efficiency:** The whole point of the product is to be cheaper than the alternative (many individual transfers). Any design choice that erodes this advantage should be questioned.
- **Clarity at the point of signing:** Anything the user is about to authorize must be presented in plain language before the wallet prompt appears, not just inside the wallet's own (often opaque) transaction preview.
- **Compatibility:** Must work with standard ERC20 tokens without requiring the token to implement anything beyond the standard.
- **Accessibility to non-developers:** A comfortable-but-non-technical wallet user should be able to complete the core journey without external help.

---

## 9. Assumptions

- Users already possess a funded, working web3 wallet before arriving at the product.
- Users are distributing a single ERC20 token per session, not a native chain asset.
- Recipient addresses are already known to the user (address collection/verification upstream, e.g., via forms or off-chain coordination, is not this product's job).
- Users have, or are willing to acquire, enough of the network's native gas currency to complete two on-chain actions (an authorization step and a distribution step).

---

## 10. Constraints

- Behavior is bound by the ERC20 standard's own semantics (e.g., an owner must explicitly authorize a third party before that party can move tokens on their behalf) — this product cannot design around that, only design a good experience within it.
- Available networks are limited to EVM-compatible chains.
- The product cannot force a token to behave correctly; a small number of non-standard or malicious ERC20 tokens exist and may behave unexpectedly regardless of how the product is built. This should be communicated to users rather than silently assumed away.

---

## 11. Success Metrics

Since this starts as a learning/portfolio project rather than a funded product launch, success metrics are framed at two levels:

**Product-quality metrics (what "good" looks like if this had real users):**
- A user can go from "wallet connected" to "distribution complete" without confusion or external help.
- Zero incidents of unintended fund loss due to product design or ambiguity.
- Measurable gas savings versus individual transfers, for a representative recipient-list size.
- Low rate of failed transactions caused by preventable input errors (i.e., validation catches problems before the wallet prompt, not after).

**Learning-project metrics (what "good" looks like for this specific effort):**
- A design that could be defended in front of an experienced web3 product reviewer or auditor without hand-waving.
- A feature set narrow enough to actually finish and ship end-to-end, rather than sprawling and stalling.

---

## 12. Risks & Open Questions

**Risks:**
- *Trust risk:* This category of product lives or dies on user trust. A single bad experience (real or perceived) around fund safety can be disqualifying, disproportionate to the actual technical severity.
- *Token compatibility risk:* Some ERC20 tokens deviate from the standard in ways that can cause unexpected behavior (e.g., non-standard return values, transfer fees, rebasing balances). The product needs an explicit stance on which of these it supports and communicates that stance to users.
- *Approval-step confusion risk:* The two-step authorize-then-distribute flow, while necessary given how ERC20 works, is a common point of confusion for less experienced users and a common vector for phishing look-alikes in the broader ecosystem. The experience needs to make this step legible, not just functional.
- *Scale risk:* Recipient lists can be large; both the underlying transaction and the interface need to remain usable as list size grows, rather than only being tested against small examples.

**Open questions to resolve before/while writing the engineering design docs:**
- What is the largest recipient-list size we commit to supporting well in v1, and what happens at the edges beyond that?
- What is our official policy on non-standard or "exotic" ERC20 tokens (fee-on-transfer, rebasing, etc.) — explicitly unsupported, best-effort, or fully supported?
- Which specific networks do we launch on first, and what's the criteria for adding more later?
- Do we ever want a "claim" (pull-based) distribution mode in addition to push-based, and if so, is that a v1.x or a genuinely separate product?

---

## 13. Future Roadmap (Directional, Not Committed)

Roughly in order of likely value once v1 is proven out:
1. Broader token support policy (explicit handling of non-standard ERC20 behavior).
2. Address-book / reusable recipient list convenience features.
3. Human-readable address resolution (e.g., ENS or equivalent).
4. Additional network support based on observed user demand.
5. Pull-based ("claim") distribution as an alternative mode.
6. Programmatic/API access for teams that want to integrate distribution into their own tools.
7. Multi-asset distribution in a single flow.

None of the above is committed scope — each should be re-justified against real usage before being built.

---

## 14. Suggested Next Documents

This PRD defines *what* and *why*. The following documents should follow, in order, to define *how*:

1. **System Architecture Document** — how the frontend, wallet, smart contract, and token contract relate to one another end-to-end.
2. **Smart Contract Design Document** — public interface, validation rules, events, security assumptions, gas considerations.
3. **Frontend Design Document** — screens, states, wallet/network flow, transaction lifecycle, error handling.
4. **Security & Threat Model** — trust assumptions, attack vectors, invariants, audit checklist.
5. **Testing Strategy** — unit, fuzz, and failure-scenario testing approach for both contract and frontend.