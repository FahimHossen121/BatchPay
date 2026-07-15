# 05 — Git and GitHub Setup

Use one Git repository at `BatchPay/`, not a repository inside each application directory. The contract ABI and frontend caller must remain compatible, and a monorepo makes that relationship visible in review and history.

```bash
cd /mnt/e/WOEKSPACE/BLOCKCHAIN/BatchPay
git init
git add .
git status
git commit -m "Initial project scaffold"
```

Inspect `git status` before every first commit. Generated outputs, environment files, and `node_modules` must not be staged. Foundry dependencies are Git submodules: `backend/lib/forge-std` and `backend/lib/openzeppelin-contracts` should appear as single gitlink entries, with their revisions recorded in `.gitmodules` and the index. Do not accidentally vendor their complete working trees.

After creating an empty GitHub repository without an auto-generated README, connect and publish it:

```bash
git branch -M main
git remote add origin https://github.com/<account>/BatchPay.git
git push -u origin main
```

Use focused commits such as `Add zero-address validation tests` rather than combining formatting, dependency upgrades, and semantic changes. Contract changes should include corresponding tests and documentation in the same reviewable change. Protect `main` with pull requests and required test checks once collaboration begins.

## A reviewable change model

For a payment contract, history is part of the safety case. A reviewer should be able to answer: which requirement changed, which source lines implement it, and which tests demonstrate it? Keep commits aligned to that question. A useful progression is design decision, contract implementation, happy-path test, negative tests, then documentation or deployment configuration. Do not rewrite published history merely to make it look tidy when it would remove review context.

The repository already contains a GitHub Actions workflow under `backend/.github/workflows/test.yml`. Confirm that it executes the same `forge test` command used locally and that it runs for pull requests. CI is a guard against accidental regressions, not an approval that the code is financially safe.

Before pushing a dependency update, inspect both the gitlink change and the upstream release notes. A library revision can alter compiled bytecode, error behavior, and gas. Pinning an exact revision makes a later audit and source verification possible.

## Secrets and accidental exposure

`.gitignore` prevents new untracked secret files from being added by default; it does not remove a secret that has already been committed. If a private key, API key, or credential ever reaches Git history, revoke or rotate it immediately. Do not rely on deleting the file in a later commit. Public test keys from local Anvil may be used only where their lack of value is unmistakable.

Use GitHub repository settings to require two-person review for deployment configuration once real funds are involved. The code can be permissionless while the operational process is still disciplined.
