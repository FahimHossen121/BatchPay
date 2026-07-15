# 14 — Fuzz Testing

Unit tests use deliberately chosen examples. Fuzz tests generate many inputs and assert properties that must always hold. They are especially valuable for arithmetic and boundary behavior that developers did not think to enumerate.

The current committed test suite has no fuzz test yet. The next safe increment is a fixed-recipient happy-path fuzz test with bounded amounts:

```solidity
function testFuzz_AirdropConservesBalances(uint96 aliceAmount, uint96 bobAmount) public {
    uint256 total = uint256(aliceAmount) + uint256(bobAmount);
    vm.assume(total <= token.balanceOf(sender));
    // approve total, distribute, then assert recipient gains and sender loss
}
```

Bound the generated values to the minted sender balance, either with `bound` or an assumption, so a failure represents BatchPay behavior rather than an intentionally unfunded account. A stronger extension fuzzes a bounded recipient count, constructs same-length arrays in the test, and verifies the conservation property: total recipient gains equal the sender decrease.

Useful properties include atomicity after a deliberately invalid recipient, no unexpected sender loss, and equality of emitted `totalAmount` to the sum. Fuzzing never replaces unit tests: deterministic tests document named requirements, while fuzzing searches the space between examples. Save a minimized failing case as a regression unit test.

## Designing useful generators

Randomness alone is not coverage. A fuzz test must constrain inputs to the domain of the property it wants to test. If arbitrary `uint256` amounts are passed to a sender with a fixed million-token balance, most cases simply test “the token rejects an impossible payment.” That is useful in a narrowly named failure test, but it obscures success behavior.

For a happy-path property, bound each generated amount and make the total affordable. For example, limit each amount to half the minted balance, or derive amounts from a bounded total. Use nonzero generated recipient addresses and exclude the BatchPay address where a scenario would be misleading. Keep the bound and its reason in the test so readers know why the generated domain is meaningful.

## Properties and extensions

For any valid affordable two-recipient batch, recipient A's balance increase equals A's requested amount, recipient B's increase equals B's amount, sender decrease equals their sum, and the contract retains no token balance. For any mismatched arrays, the call reverts before token state changes. For an invalid recipient at any index, no recipient gains tokens.

Dynamic-array fuzzing can use a bounded count and construct arrays in Solidity. Keep the maximum deliberately modest—such as 1 through 16—so it explores shape variation without spending test time mostly on gas-heavy lists. Large-list behavior is better covered by targeted gas and integration tests.

Foundry also supports invariant testing, where sequences of randomized calls are attempted and an invariant is checked after each sequence. BatchPay's statelessness makes the initial invariant set compact: the contract should not retain ordinary token balances from distributions, and a successful call can only reduce the current caller’s balance through the token. Introduce invariants after basic fuzz properties are established.
