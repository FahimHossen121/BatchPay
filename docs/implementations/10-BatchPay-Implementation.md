# 10 — BatchPay Implementation

The implementation is [BatchPay.sol](../../backend/src/BatchPay.sol). It follows the design without storage variables or privileged methods.

`using SafeERC20 for IERC20` adds the library’s checked wrappers to values cast as `IERC20`. The contract declares four custom errors: `ZeroAddressToken`, `EmptyRecipientList`, `ArrayLengthMismatch`, and `ZeroAddressRecipient`.

Validation occurs before meaningful work: first the token address, then empty list, then matching array length. This order makes malformed shapes fail before indexing `amounts[i]`. The recipient check stays inside the loop because each address is examined while its corresponding amount is processed.

```solidity
for (uint256 i = 0; i < recipients.length; i++) {
    if (recipients[i] == address(0)) revert ZeroAddressRecipient();
    totalAmount += amounts[i];
    IERC20(token).safeTransferFrom(msg.sender, recipients[i], amounts[i]);
}
```

The loop uses `calldata` arrays and has O(n) external token calls, which is inherent in a push payment to n recipients. `totalAmount` is computed for the event rather than accepted as untrusted input. If a transfer fails due to allowance, balance, token rules, or a token-level revert, the EVM reverts the entire call, including earlier transfers and the accumulated event.

The implementation currently allows an amount of zero and duplicate recipients, as specified in Chapter 08. It has no deployment script yet; deployment operations are a future, documented step in Chapter 17.

## Reading the source from top to bottom

The SPDX license identifier and pragma are compiler metadata. Imports then make two OpenZeppelin definitions available: `IERC20` describes the calls BatchPay needs, and `SafeERC20` adds a defensive wrapper. No local token implementation is deployed by BatchPay.

The four errors and one event form the contract's observable interface alongside its function. Consumers can decode these selectors and event fields from ABI data, so renaming or removing them after a deployment would be an interface-breaking change even though no storage layout exists.

Inside `airdropERC20`, the local `totalAmount` begins at zero for each transaction. It is not a persistent accounting record. The contract adds each requested amount before making its corresponding transfer. If the transfer fails, both the addition and every earlier external effect in the transaction roll back. If all transfers succeed, the accumulated integer is emitted once.

## Why `safeTransferFrom` is called inside the loop

The desired payment is one token transfer per recipient. There is no ERC-20 operation that transfers a vector of different values to a vector of accounts, so the loop is fundamental. Invoking `safeTransferFrom` inside it also ensures each token movement uses the same caller—the BatchPay contract—while the owner is `msg.sender` passed by the EVM context.

The contract does not first calculate the sum in a first loop and then transfer in a second loop. A two-pass approach would let it precompute a total for a custom balance/allowance check, but that check would duplicate token logic and cost additional iteration. One pass is simpler, and atomicity ensures no partially completed state remains when a later transfer fails.

## Review checklist for this implementation

- Confirm `msg.sender`, rather than a supplied sender address, is used as the owner in every transfer.
- Confirm every array index is safe after length validation.
- Confirm the token and recipient zero-address checks are before their values are relied upon.
- Confirm the event is after the entire loop.
- Confirm there are no state variables, delegatecalls, owner methods, or native-currency paths hidden elsewhere in the source.
- Confirm the imported OpenZeppelin revision is the intended pinned dependency.

One implementation detail to revisit during a formal security review is interaction ordering. The function validates a recipient, updates only a local variable, then makes an external token call. Because BatchPay has no mutable storage, the usual reentrancy pattern of corrupting state is absent; nevertheless, an adversarial token can create unexpected nested execution. Tests and an independent reviewer should examine this assumption rather than treating statelessness as an automatic proof of safety.
