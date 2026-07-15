# 17 — Deployment

Deployment is not yet implemented in this repository: there is no committed `backend/script/` deployment script and no canonical contract address. This chapter defines the required release workflow rather than claiming a deployment occurred.

1. Pin and review dependencies; run `forge fmt --check`, `forge build`, and the full test suite from `backend/`.
2. Deploy to a testnet using a dedicated deployer account funded only for the task. Put RPC URLs, explorer keys, and private keys in ignored environment variables.
3. Exercise approval and distribution with a test token, including an expected failure.
4. Verify the exact source and compiler settings on the chain explorer. Record chain ID, address, transaction hash, compiler version, optimizer configuration, commit SHA, and dependency revisions in a release note.
5. Configure the frontend’s per-chain contract-address map only after verification. Confirm it refuses unknown or mismatched chains.
6. Repeat the checklist for production, with a peer reviewing the address, bytecode, account, and configuration before funds are sent.

A future Foundry script should use `vm.startBroadcast()` only around the deployment transaction and take configuration from environment variables. Do not hard-code secrets or silently choose a chain. A release is incomplete until users have the verified address and the frontend points to that same address.

## Deployment script shape

A future script belongs under `backend/script/`, for example `DeployBatchPay.s.sol`. It should read a private key or hardware-wallet configuration from the environment, obtain the expected chain ID, reject an unexpected network, and deploy `new BatchPay()` inside the broadcast section. The script must print or write the resulting address in a controlled release artifact; it must not leave the only record in terminal scrollback.

The command form will resemble the following, but do not execute it until the script and target configuration have been reviewed:

```bash
forge script script/DeployBatchPay.s.sol:DeployBatchPay \
  --rpc-url "$RPC_URL" --broadcast --verify
```

`--broadcast` turns a simulated script into submitted transactions. It is therefore the boundary requiring the strongest review. `--verify` requests explorer verification when the configured explorer supports it; check its output independently rather than assuming success.

## Release records and post-deployment verification

Because the contract is immutable, rollback means stopping frontend routing to a deployment and, if necessary, deploying a corrected version. It cannot mean changing code at the existing address. A release record should include a semantic version, Git commit, source hash, network, contract address, deployment transaction, dependency revisions, and known limitations.

Before changing a frontend address map, have a second person compare the proposed address against the explorer's verified contract and the deployment record. Then perform a small controlled distribution using a supported test token, inspect the token `Transfer` logs and `Airdropped` event, and confirm the frontend displays the confirmed transaction correctly.
