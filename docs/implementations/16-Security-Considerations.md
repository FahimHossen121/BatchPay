# 16 — Security Considerations

Security is the continuing application of the architecture’s trust boundaries. The core invariants are: BatchPay holds no retained funds; only `msg.sender`’s approved tokens are requested; malformed batches fail; and a failed transfer leaves no partial distribution.

| Risk | Mitigation | Remaining responsibility |
| --- | --- | --- |
| Malformed input | On-chain structural validation and custom errors | Frontend gives early, clear feedback |
| Unlimited allowance | UI requests exact total by default | User verifies the spender and amount in wallet |
| Non-standard token behavior | `SafeERC20` handles optional returns | Fee/rebasing tokens are unsupported and must be disclosed |
| Oversized batch | Frontend gas estimation | Direct callers can still waste their own gas |
| Malicious frontend | Wallet confirmation and contract validation | User must use trusted deployment addresses |
| Regression | Unit tests, future fuzzing, review | Independent audit before meaningful production value |

The contract has no owner, pause, upgrade, or withdrawal function. This reduces administrator and upgrade-key risk, but means a discovered bug requires a new deployment and migration rather than a patch in place. Immutability is a trade-off, not a substitute for testing.

Before production, verify the source on the target explorer, publish canonical contract addresses, test against intended token types, run static analysis and fuzz/invariant tests, and obtain an independent review appropriate to the funds at risk. Never use a deployer private key in a repository or browser environment.

## Threat model

Assume a caller can bypass the frontend, send arbitrary ABI-encoded input, choose an unusual token contract, and submit transactions in any order. Assume the frontend can be modified by a compromised hosting account or deceptive domain. Assume a user can make an approval mistake. Do not assume recipients are honest, that metadata identifies an authentic token, or that every ERC-20 has simple transfer behavior.

BatchPay is not designed to protect a user who approves a malicious contract address or signs a transaction they did not review. It reduces that risk through exact approvals, public source verification, a small interface, and clear UI, but the wallet signature remains authoritative. Publish deployment addresses through more than one trusted channel and provide explorer links so users can independently verify the spender.

## External calls and operations

Every `safeTransferFrom` invokes third-party code. `SafeERC20` handles return-value irregularities; it does not remove all risks of a token invoking callbacks or reverting strategically. BatchPay has no mutable storage, so there is no balance mapping or accounting state for a reentrant call to corrupt. That is a strong simplification, but it is not a license to skip adversarial-token tests and review.

Separate deployer, test, and personal wallet accounts. Use a hardware wallet or secure signing policy for valuable deployments. Verify the chain ID in scripts and wallet prompts. A perfect contract does not prevent a user from being directed to a phishing interface that asks them to approve another spender, so review must include dependency provenance, CI integrity, GitHub access controls, and frontend hosting controls.
