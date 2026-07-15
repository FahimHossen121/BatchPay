# 06 — Project Structure

The repository has a product-level structure and a contract-level structure. Keeping them separate avoids turning a frontend convenience concern into on-chain logic.

| Location | Responsibility |
| --- | --- |
| `backend/src/BatchPay.sol` | production batch-transfer contract |
| `backend/test/BatchPay.t.sol` | isolated contract behavior tests and mock token |
| `backend/lib/` | pinned `forge-std` and OpenZeppelin dependencies |
| `backend/script/` | reserved for deployment scripts; none is committed yet |
| `frontend/` | reserved for the future Next.js application |
| `docs/` | PRD, architecture, and smart-contract design sources |
| `docs/implementations/` | progressive engineering handbook |

Foundry remappings let readable imports resolve into `lib/`. For example, `@openzeppelin/contracts/...` resolves to the pinned OpenZeppelin library rather than an arbitrary global installation. This makes a build reproducible for another developer.

Tests sit beside the contract project, not inside `src/`, because production deployment must contain no test-only contracts. The current mock ERC-20 is intentionally declared in the test file: it exists to control test state, not as a production token implementation.

As the project grows, add new contracts by domain (`src/interfaces`, `src/libraries`) only when they introduce a real separation. A small contract should stay easy to inspect rather than being fragmented for aesthetics.

## How the structure reinforces boundaries

`src/` is the production boundary. A file there must be understandable as deployable code, with no test cheats, private keys, or assumptions about local accounts. The current `BatchPay.sol` imports only the ERC-20 interface and a production safety library. That minimal dependency surface is meaningful: it is the code a user must trust.

`test/` is allowed to be more convenient. Its `MockERC20` exposes `mint` so a test can arrange balances without pretending that production tokens expose a mint function. Test-only helpers must never leak into `src/`; an accidentally deployable mock token or test access control is a real operational risk.

`script/` is an operational boundary. Scripts can broadcast transactions and therefore require stricter handling of environment variables and chain selection than tests. Keeping them separate lets a reviewer distinguish code that models behavior from code that can alter a real network.

## Documentation as a maintained interface

The top-level documents answer different questions: `PRD.md` explains the user and product problem, `Architecture.md` defines component and trust boundaries, and `SmartContractDesign.md` specifies the intended contract API and policies. This handbook explains the implementation and workflow. Updating a contract without updating the relevant design and implementation chapter creates two competing interfaces for future contributors.

When the frontend begins, preserve this separation. It may consume a generated ABI and deployment-address map, but it should not duplicate Solidity validation rules as a hidden second specification. Its own directory should own UI state, formatting, wallet connection, and input parsing; the contract remains authoritative for fund-safety rules.
