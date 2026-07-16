# Local Dev Startup Guide — BatchPay

Run this every time you restart your PC / reopen the project. Anvil's chain state resets on every restart, so contracts need to be redeployed each session — the Makefile automates the whole sequence.

**Security note:** this project uses Foundry's encrypted keystore (`cast wallet import`), not a `.env` file or raw private keys in commands. The keystore is set up once (see bottom of this doc); after that, deploys just prompt for your password interactively.

---

## Every session

```bash
make up
```

This single command:
1. Starts Anvil in the background (logs at `/tmp/batchpay-anvil.log`, PID tracked at `/tmp/batchpay-anvil.pid`).
2. Deploys `BatchPay`, then `MockERC20` — you'll be prompted for your keystore password twice (once per deploy; Foundry doesn't cache the unlocked keystore across separate script runs).
3. Runs the full test suite (expect 15 passing).
4. Prints both deployed contract addresses.

**Note the two printed addresses** — you'll need the `MockERC20` one to paste into the frontend's token input field.

Then, in the same or a new terminal:

```bash
make frontend
```

Visit `http://localhost:3000`.

When you're done for the session:

```bash
make down
```

Stops the background Anvil process cleanly.

---

## Other useful commands

```bash
make test              # just re-run the test suite (Anvil doesn't need to be running for this)
make deploy             # redeploy both contracts without restarting Anvil or re-running tests
make clean-artifacts    # forge clean — clears stale build warnings
make help               # list all available commands
```

---

## In the browser / MetaMask

- Confirm MetaMask is on the **Anvil** network (chain ID `31337`) — this setting persists across restarts, but double-check if something looks wrong.
- If balances look stale, that's expected — Anvil resets on every restart, so old balances are gone.
- Paste the current session's `MockERC20` address into the frontend's token input field.

---

## One-time setup (only needed once per machine, not every session)

```bash
cast wallet import anvilAccount --interactive
```

- When prompted, enter Anvil's key 0: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Set a password — this is what you'll type in during `make up`'s two deploy prompts.
- Verify it saved correctly:
  ```bash
  cast wallet list
  ```
  Should show `anvilAccount` resolving to address `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` (Anvil's account 0). If the address doesn't match, you likely mistyped the private key — re-import with a fresh name rather than trying to fix the existing one.
- Clear shell history after typing the raw key anywhere: `history -c`

**Never** put this private key in a `.env` file, a password file, or type it directly into a `forge script ... --private-key 0x...` command. The `--account anvilAccount` flag (baked into the Makefile) replaces that entirely.