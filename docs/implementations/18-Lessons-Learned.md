# 18 — Lessons Learned

BatchPay is deliberately narrow because payment systems earn trust through comprehensibility. A small contract with a single obvious responsibility is easier to test, review, deploy, and explain than a feature-rich payment platform.

Several transferable engineering principles emerge:

- Design from trust boundaries, not screens. The frontend may be helpful and polished, but contract validation is the enforcement point.
- Prefer a standard’s existing mechanism to invented custody. ERC-20 allowance plus direct `transferFrom` keeps balances in the token contract.
- Treat atomicity as product behavior. “All recipients or none” is a user promise, not merely EVM trivia.
- Make constraints visible. Two signatures, unsupported token classes, and gas limits should be stated before a user signs.
- Measure before optimizing. Recipient transfers dominate cost; a benchmark is more valuable than a speculative rewrite.
- Separate current facts from plans. Fuzzing, gas baselines, deployment scripts, and the frontend are next milestones, not completed work.

The handbook’s next revision should follow evidence: add fuzz and invariant tests, benchmark realistic batches, build and test the frontend transaction flow, deploy and verify on a testnet, then obtain independent security review before substantial real-value use.

## Decisions that generalize

The strongest BatchPay decision is not a Solidity syntax choice; it is refusing to make the contract a custodian. That one boundary removes withdrawal logic, internal balances, recovery procedures, and administrator powers. Similar projects should begin by asking which component must own assets and whether the answer can be “the existing standard token contract.”

Another durable lesson is to locate enforcement where an adversary cannot bypass it. Client-side validation makes a product usable, but an EVM caller can construct calldata without the client. Conversely, on-chain checks cannot explain an approval flow in human terms, so a trustworthy system needs both layers with distinct responsibilities.

A narrowly documented limitation is a feature of honest engineering. Saying that fee-on-transfer tokens are unsupported is better than implying broad compatibility the code does not guarantee. Saying that fuzz tests and a deploy script are not yet present makes the roadmap actionable and keeps a portfolio project credible.

## Suggested progression

The next development cycle should first strengthen evidence for the existing contract: add event, atomicity, zero-value, duplicate-recipient, fuzz, and adversarial-token tests; establish gas baselines; and pin deployment compiler settings. Then implement the frontend review and transaction lifecycle with integer-safe amount parsing and test it against Anvil. Only after testnet deployment, source verification, and independent review should the project consider real-value production use.

New features—CSV import, saved lists, multiple assets, scheduled payments, pull claims, or cross-chain support—should start with a new product and threat-model decision. They are not harmless additions to a batch-transfer loop; each changes the users, state, custody assumptions, or operational surface that made v1 understandable.
