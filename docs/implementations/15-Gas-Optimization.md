# 15 — Gas Optimization

BatchPay’s dominant cost is unavoidable: one ERC-20 `transferFrom` call per recipient. Therefore gas grows approximately linearly with recipient count, and token implementations can materially change the per-recipient cost. Benchmark on representative tokens and list sizes before claiming a saving.

Existing choices that avoid needless overhead are `calldata` arrays, custom errors, a stateless contract, a single summary event, and no intermediate custody transfer. The loop computes the event total while iterating, avoiding a second loop. These are clarity-preserving optimizations, not clever micro-optimizations.

Capture a baseline with:

```bash
cd backend
forge snapshot
```

Add named tests for 1, 10, and a practical upper-bound number of recipients, then compare snapshots in code review. Gas reports are evidence, not an optimization target by themselves.

Do not remove validation, use unchecked arithmetic without a documented proof, or pack the public API into opaque bytes merely to reduce gas. The contract moves funds; auditability and a correct failure model are worth more than a marginal saving. The frontend should estimate gas before signing and warn when a batch may exceed a chain’s block limit.

## What should be measured

Measure the complete distribution transaction on the intended token class, not only BatchPay's isolated loop. The first transfer may cost differently from later transfers due to cold versus warm account access; a token may update storage differently for new and existing recipient balances. Record recipient count, token implementation, compiler settings, Foundry version, and whether recipients were initially zero balance. Without that context, a gas number is not comparable.

Compare the batch cost with the realistic alternative: a user making one ERC-20 transfer transaction per recipient. The batch still pays one transfer operation per recipient, but it amortizes the user's transaction overhead and produces one confirmation flow. Its savings are therefore a measured property of a workload, not a guarantee for every token.

## Reasonable optimization order

First remove accidental duplicate loops and unnecessary storage. Next prefer calldata for external inputs and compact custom errors where they preserve clarity. Then benchmark any proposed source change. Only after data supports a material benefit should the team consider a substantially different architecture, such as a pre-funded distributor or Merkle claim system. Those alternatives change custody, user interaction, and audit surface.

Solidity 0.8 overflow checks protect arithmetic. An `unchecked` increment for a loop counter can sometimes reduce cost when the loop condition proves overflow impossible, but this minor gain must be measured and documented. The existing straightforward loop is the preferred baseline.
