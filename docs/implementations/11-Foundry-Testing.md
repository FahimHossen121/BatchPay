# 11 — Foundry Testing

Foundry tests are Solidity contracts. A function named `setUp` runs before each test; functions prefixed `test` are discovered and executed. This gives each test a fresh, deterministic EVM state.

Run the suite from the Foundry project:

```bash
cd backend
forge test
forge test -vvv
```

The first command reports pass/fail and gas. `-vvv` adds useful traces for failures; increase verbosity only when needed, because large traces hide the relevant call path. `forge build` compiles without running tests, and `forge fmt` formats Solidity before review.

`forge-std/Test.sol` provides cheatcodes through `vm`. BatchPay’s tests use `makeAddr` for deterministic readable addresses, `startPrank`/`stopPrank` to change `msg.sender`, and `expectRevert` to assert a failed transaction. The test-local `MockERC20` mints controlled balances and inherits OpenZeppelin’s well-tested ERC-20 behavior.

Testing a contract is not only checking return values. Each test should state a behavioral promise: correct balances after a batch, invalid requests fail, and token-enforced permission failures remain atomic. Chapter 12 maps those promises to the current suite.

## The test lifecycle

Foundry deploys a new test contract and invokes `setUp()` before each test function. In BatchPay, setup deploys a fresh `BatchPay`, deploys a fresh mock token, creates deterministic addresses, and mints the sender balance. This isolation is important: an approval granted in one test cannot make a later test unexpectedly pass.

`vm.startPrank(sender)` changes the caller for every subsequent call until `vm.stopPrank()`. It models a wallet owner approving and submitting the distribution. Use it narrowly: a broad prank can accidentally cause a setup or assertion call to originate from the wrong address. `makeAddr("alice")` produces a deterministic address based on a label, which makes traces readable without relying on arbitrary hard-coded hexadecimal values.

## Choosing test commands

```bash
forge test --match-contract BatchPayTest
forge test --match-test test_AirdropERC20_HappyPath -vvvv
forge test --gas-report
```

The first narrows execution to one suite. The second isolates a single scenario and requests a detailed trace, useful when diagnosing a revert through BatchPay and the mock token. The gas report is a diagnostic measurement; it is not a replacement for stable snapshot benchmarks. Keep normal CI output short and use verbose traces only for failures or focused investigation.

## What tests cannot prove

The mock token is intentionally conventional. Passing against it does not prove compatibility with every deployed ERC-20, wallet, RPC provider, or chain. Tests also do not verify explorer source verification, frontend amount parsing, or a user's review of the wallet prompt. Those require integration tests and operational checks. A robust suite makes the precise claim it has evidence for, then names the remaining risk.
