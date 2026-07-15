# 12 — Unit Testing

The current suite is [BatchPay.t.sol](../../backend/test/BatchPay.t.sol). It contains seven focused tests.

| Test group | What it proves |
| --- | --- |
| Happy path | Two recipients receive 100 and 200 tokens; sender balance decreases by 300. |
| Shape validation | Zero token, empty list, unequal arrays, and zero recipient revert with the intended custom error selector. |
| Token enforcement | Insufficient allowance and insufficient balance cause the token interaction to revert. |

The happy-path test first mints one million mock tokens in `setUp`, impersonates `sender`, approves 300 tokens, then invokes BatchPay. Assertions inspect token balances, the observable outcome that matters most. It deliberately approves the exact aggregate total, mirroring the recommended product flow.

Validation tests use `vm.expectRevert(BatchPay.Error.selector)`. Matching the selector proves a specific BatchPay rule failed rather than some unrelated downstream call. The allowance and balance tests use a generic `expectRevert`, because their error originates in the ERC-20 dependency; a future suite may assert OpenZeppelin’s specific custom-error selector after pinning the expected dependency behavior.

Unit tests should remain short and isolate one reason to fail. Do not turn one test into a sequence of unrelated expectations: when a payment contract regresses, a small failing test is safer and faster to diagnose.

## Current test cases in detail

`test_AirdropERC20_HappyPath` constructs two equal-length arrays, approves exactly 300 base-unit token amounts expressed as `ether` units, then makes the batch call as the sender. The three balance assertions establish the externally visible outcome: Alice receives 100, Bob receives 200, and the sender loses their combined 300. A further improvement is to assert the remaining allowance and the `Airdropped` event fields; this would verify the full contract interface, not only balances.

The four structural tests deliberately do not prank a sender or approve tokens because the relevant errors must happen before any token transfer attempt. This is useful test design: it demonstrates that the contract owns those failures and that they do not depend on mock-token setup. Each uses the custom error selector, avoiding a weak assertion that merely expects some revert.

The two implicit-failure tests set up conditions that pass BatchPay's local validation but fail inside the token. One approves less than the requested amount. The other approves enough but mints too small a balance. This distinction matters because allowance and balance are independent ERC-20 conditions. It also proves that BatchPay does not bypass or emulate the token's authorization model.

## Missing deterministic coverage

The current seven tests are a good baseline, not a complete test strategy. Add tests for zero amounts (document the allowed behavior), duplicate recipients (document that each entry is applied), a single recipient, an event expectation, and atomic rollback where an earlier recipient would otherwise have been paid before a later token-level failure. An adversarial or fee-on-transfer mock can make the compatibility boundary explicit.

For each new test, name the observable rule, arrange only the necessary state, perform one action, and assert the result. Avoid assertions based on internal implementation details such as a loop counter; a refactor should be allowed to change internal structure while retaining payment behavior.
