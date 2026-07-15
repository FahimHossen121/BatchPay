# 04 — Foundry Project Initialization

From an empty backend directory, Foundry initializes a project with:

```bash
cd backend
forge init .
forge build
forge test
```

`forge init .` creates the scaffold in the current directory rather than nesting another folder. The initial `Counter` contract, test, and deployment script prove the toolchain works; they should be removed only after the baseline build and test succeed.

The relevant layout is:

```text
backend/
├── src/            production Solidity
├── test/           Solidity test contracts (`*.t.sol`)
├── script/         deployment and operational scripts
├── lib/            pinned external dependencies
├── foundry.toml    Foundry configuration
├── remappings.txt  Solidity import aliases
└── foundry.lock    dependency lock data
```

BatchPay’s `foundry.toml` keeps the conventional `src`, `test`, `out`, and `lib` paths. Generated `out/` and `cache/` contents are intentionally not source-controlled: they can be rebuilt from the source and pinned dependencies.

Run all commands in `backend/`. A successful initial scaffold establishes that the compiler, dependency mechanism, and test runner work before product code is introduced. This isolates setup failures from contract failures.

## Dependencies and remappings

The initial Forge project supplies `forge-std`, the testing and scripting library. BatchPay additionally installs OpenZeppelin Contracts for `IERC20`, `ERC20` in the test mock, and `SafeERC20` in production. These libraries are checked out beneath `lib/` as submodules. A submodule pins another Git repository at a particular commit: it provides reproducibility while allowing deliberate future upgrades.

Solidity import paths are resolved through `remappings.txt`. This permits imports such as:

```solidity
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
```

instead of relative paths that couple the source to a particular directory layout. When a clone is made elsewhere, initialize submodules before building:

```bash
git submodule update --init --recursive
```

If imports fail, inspect `remappings.txt`, `.gitmodules`, and `git submodule status` before editing source. Reinstalling a library without understanding the submodule state can leave the repository with an unreviewed dependency revision.

## Removing scaffold code responsibly

The default Counter example has educational value only as an installation check. Once its build and tests pass, remove the example source, test, and script together. Leaving an unused deployment script is particularly dangerous: an operator might run an obsolete command during a release.

Initialize from the monorepo root only when managing Git. Run `forge init .`, `forge install`, and `forge test` from `backend/`. Creating a second `.git` directory under `backend/` would split history and make the parent repository treat it as an opaque nested repository; BatchPay intentionally avoids that arrangement.
