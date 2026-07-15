# BatchPay Implementation Handbook

This handbook records how BatchPay is designed, built, tested, and prepared for release. It is ordered as a learning path: architecture and tooling first, contract design and implementation next, then verification and operations.

| Part | Chapters |
| --- | --- |
| Foundations | 01–06 |
| Solidity and token interaction | 07–08 |
| Contract engineering | 09–10 |
| Verification | 11–14 |
| Production engineering | 15–18 |

The repository is a monorepo. `backend/` is the Foundry project; `frontend/` is reserved for the web application. Statements about implemented behavior refer to the current `backend/src/BatchPay.sol`. Planned work is explicitly labelled so that the handbook never presents an intention as a shipped feature.

Start with [01 Architecture](01-Architecture.md). The source documents in `docs/` remain the product and design references for this handbook.
