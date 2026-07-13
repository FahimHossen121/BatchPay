Architecture Document — BatchPay
Version: 1.0
Status: Draft
Depends on: PRD v1.0
1. Purpose
This document describes the overall system shape: what components exist, what each is responsible for, and how data and control flow between them. It does not define contract functions or frontend components — that's the next two documents.
2. System Overview
Three independent systems collaborate, none of which trusts the others by default:
        User
         │
         ▼
   Wallet (MetaMask, etc.)
         │
         ▼
   Frontend Application (React/Next.js)
         │
         ▼
   Blockchain Network (EVM)
         │
    ┌────┴─────┐
    ▼           ▼
BatchPay      ERC20 Token
Contract       Contract
Key architectural fact: the BatchPay contract never holds user funds. Balances live only in the ERC20 token contract. BatchPay is a relay that, with permission, tells the token contract to move funds directly from the user to each recipient.
3. Components & Responsibilities
3.1 Wallet (external, not built by us)

Holds private keys.
Signs transactions.
Is the only component that ever touches key material.

3.2 Frontend Application
Responsible for:

Wallet connection and network detection/switching.
Collecting and validating input (token address, recipients, amounts) before anything is sent to a wallet for signing.
Reading on-chain state (token metadata, current allowance) to inform the UI.
Constructing the two transactions (approve, distribute) and requesting signatures.
Reporting transaction status back to the user in plain language.

Not responsible for:

Any business-logic validation that matters for fund safety — the frontend can guide the user, but the contract is the actual source of truth and must not assume the frontend's checks already happened.
Holding any secret or funds.

3.3 BatchPay Contract
Responsible for:

Accepting a token address, a recipient list, and an amount list.
Validating that inputs are internally consistent (covered in the Smart Contract Design doc).
Pulling tokens from the caller (via the ERC20 allowance mechanism) and pushing them to each recipient.
Emitting events that let off-chain systems reconstruct what happened.
Failing atomically — either the whole distribution succeeds or none of it does.

Not responsible for:

Ever custodying funds beyond the span of a single transaction.
Knowing anything about the frontend.

3.4 ERC20 Token Contract (not built by us)

Owns all balance and allowance state.
Enforces the approve / transferFrom permission model.
Is untrusted, third-party code from BatchPay's perspective — it could in principle be non-standard or adversarial, and the design should acknowledge that rather than assume good behavior.

4. Data Flow — Core Journey
1. User connects wallet             → Frontend reads address, chain ID
2. User enters token address        → Frontend reads name/symbol/decimals from ERC20 contract
3. User enters recipients + amounts → Frontend validates format, computes total client-side
4. Frontend shows preview           → User reviews total, recipient count, token identity
5. User signs approve()             → Wallet → ERC20 contract: allowance(user → BatchPay) = total
6. User signs distribute()          → Wallet → BatchPay contract
7. BatchPay validates inputs        → reverts entire tx if anything is inconsistent
8. BatchPay loops recipients        → calls ERC20.transferFrom(user, recipient, amount) per entry
9. ERC20 contract moves tokens      → checks allowance, updates balances, emits Transfer events
10. BatchPay emits its own event    → Frontend listens/polls, shows success state
Two separate signatures are required (step 5 and 6) because of how ERC20 allowances work — this is a constraint of the token standard, not a design choice we get to avoid. The frontend's job is to make that two-step nature legible rather than confusing.
5. Trust Boundaries
This is the most important section of this document, given the PRD's non-custody requirement.
BoundaryWhat crosses itWho's trustedUser ↔ WalletTransaction data to signWallet trusted with keys; user must be shown accurate data to signFrontend ↔ WalletUnsigned tx requestsFrontend is untrusted by the wallet; wallet shows its own confirmationFrontend ↔ BlockchainRead calls, submitted signed txsFrontend trusted to display correctly, not trusted to enforce correctnessBatchPay ↔ ERC20 ContracttransferFrom callsBatchPay must not assume the ERC20 contract behaves perfectly (non-standard tokens exist)User ↔ BatchPayAllowance grantUser grants exactly enough allowance for one distribution, not unlimited approval, by default
Design implication: the contract must independently validate everything the frontend already validated. The frontend's validation is a UX convenience, not a security control. This is the standard "don't trust the client" principle applied to web3.
6. Network & Multi-Chain Considerations

BatchPay contract must be deployed separately per chain (no cross-chain messaging in v1).
Frontend must track, per chain, the deployed contract address it should talk to.
Frontend must detect the wallet's current network and prevent a mismatched-network submission before it reaches the wallet.

7. What This Architecture Deliberately Avoids

No backend server / API of our own. The frontend talks directly to the blockchain via the wallet. This removes an entire class of "who runs the backend, who trusts it" problems, at the cost of the frontend being fully public/static (consistent with the PRD's non-custody goal and the earlier plan to deploy statically to IPFS).
No off-chain database. All state that matters (balances, allowances, distribution history) lives on-chain and is queryable directly.

8. Open Items for the Smart Contract Design Doc
Carried forward from the PRD, to be resolved when we write that document:

3-parameter vs 4-parameter airdrop interface (whether totalAmount is supplied or computed).
Policy on non-standard ERC20 tokens (fee-on-transfer, rebasing, non-boolean-returning transfer).
Any cap or practical limit on recipient-list size.