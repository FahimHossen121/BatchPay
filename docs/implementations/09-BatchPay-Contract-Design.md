# 09 — BatchPay Contract Design

BatchPay has one permissionless entry point:

```solidity
airdropERC20(address token, address[] calldata recipients, uint256[] calldata amounts)
```

Calling it means: for every index `i`, ask `token` to transfer `amounts[i]` directly from `msg.sender` to `recipients[i]`. The contract is deliberately stateless, unowned, unpausable, and immutable. A caller can only spend their own approved tokens.

## Decisions

| Decision | Reason and trade-off |
| --- | --- |
| Compute total on chain | Avoid trusting a caller-supplied duplicate total. It costs an addition already adjacent to the loop. |
| Direct `transferFrom` calls | Preserves non-custody and keeps accounting simple. A pull-then-push design adds temporary custody and more failure paths. |
| No recipient cap | Token gas cost varies by implementation; the frontend estimates gas rather than enforcing an arbitrary limit. Oversized direct calls fail at the caller’s cost. |
| SafeERC20 | Supports many non-standard return-value tokens. Fee tokens and rebasing tokens remain unsupported. |
| One summary event | Logs recipient count and total efficiently; individual token `Transfer` events retain per-recipient detail. |

## Preconditions and outcomes

The token address and every recipient must be nonzero, the list must be nonempty, and array lengths must match. The external token enforces balance and allowance. Every failure reverts the whole transaction; partial payouts are not an accepted outcome.

On success, `Airdropped(sender, token, recipientCount, totalAmount)` is emitted. Its first two fields are indexed to support efficient filtering. No frontend validation can replace these on-chain checks.

## API rationale

An earlier possible interface accepted a fourth `totalAmount` parameter. That looks convenient for an approval preview, but it duplicates information already represented by `amounts`. A caller could provide a total inconsistent with the list, forcing another validation rule and inviting a UI or integration mistake. The selected three-parameter API computes the total internally for the event while the frontend independently computes it for the approval amount. Each component owns its own calculation rather than trusting a caller-supplied duplicate.

The function uses parallel arrays because the EVM ABI handles them simply and the relationship is clear: recipient at index `i` gets amount at index `i`. A struct array could express the same relationship but does not materially improve this small public interface. Parallel arrays make the required equal-length validation explicit.

## Validation order

The intended order is token address, nonempty recipient list, equal lengths, then each recipient in the iteration. This is not merely aesthetic. The first three checks have constant cost and prevent an invalid shape from reaching an array access. Each recipient is then checked immediately before its transfer. A zero amount is permitted; treating it as a no-op avoids imposing an arbitrary rule, although the UI should generally omit it to avoid wasting gas.

There is intentionally no explicit precheck that the user has enough total balance or allowance. The ERC-20 token is the canonical source of both values, and a separate precheck would add calls, provide no guarantee against state changes, and potentially behave differently from the token's actual transfer logic. A failed `safeTransferFrom` supplies the authoritative on-chain result.

## Event and observability design

The summary event includes the caller, token, count, and computed total. Indexing `sender` and `token` lets an indexer filter a user's distributions of one asset without scanning every event. Recipient addresses are not emitted one-by-one because the token's own `Transfer` logs already contain them, and duplicating n addresses in BatchPay logs would increase cost. An event is emitted only after the loop completes, so an `Airdropped` log unambiguously represents a complete batch.

## Explicit design limits

BatchPay does not validate that `token` contains code. A call to a zero-code address can appear to succeed at the low-level EVM level depending on the call pattern, so the current practical support contract should be strengthened with integration tests and frontend checks for code and ERC-20 metadata before production release. It also does not attempt a reentrancy guard. The state-free design reduces reentrancy impact, but external token calls remain a point that deserves independent review before real-value deployment.

The lack of a recipient cap is an intentional delegation to the frontend's gas estimator. On a large list, the call can exceed block gas limits or user wallet limits. The correct user-facing response is to split the list into explicit, independently reviewed batches—not to silently truncate recipients.
