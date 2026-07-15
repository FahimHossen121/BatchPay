# 03 — Foundry Installation

Foundry is the Rust-based Ethereum toolchain used by BatchPay. `forge` builds, tests, formats, and runs scripts; `cast` reads and writes chain data; `anvil` runs a local EVM node; and `chisel` is an interactive Solidity REPL.

The project was installed with:

```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

The first command installs `foundryup`, Foundry's updater, into the shell path. Sourcing `.bashrc` reloads that path in the current terminal. `foundryup` downloads verified binaries. The recorded installation produced Foundry 1.7.1; versions naturally change, so record `forge --version` in troubleshooting reports rather than assuming this version.

Verify every required executable:

```bash
forge --version
cast --version
anvil --version
chisel --version
```

If `foundryup` is not found, open a new shell or source the relevant profile. If the download fails, first check network access and the project’s official Foundry installation instructions. Do not substitute unverified binaries: contract tooling participates in the security boundary of the development process.

Installation only establishes the tools. It does not create a project, install Solidity dependencies, or configure a deployment account; those concerns are handled in the following chapters.

## What each tool contributes

`forge` is the primary tool used throughout this project. It resolves remappings, invokes `solc`, runs Solidity tests in an in-memory EVM, reports traces, creates scripts, and can generate gas snapshots. Its tests are compiled contracts, so the execution model closely matches the code that will run on-chain.

`cast` is intentionally separate. It is useful for inspecting a token's `decimals`, allowance, or code at an address, encoding ABI calls, and performing controlled operational checks. It should be used with explicit RPC URLs and chain IDs; a successful call against the wrong network is still the wrong result.

`anvil` provides local accounts, balances, mining, and JSON-RPC. It allows a developer to run a frontend against a controllable network and to reproduce a transaction sequence without spending real funds. Unlike a public network, it is not shared infrastructure and should never be described as deployment evidence.

`chisel` is a REPL for experimenting with Solidity expressions or ABI encoding. It is optional for BatchPay but useful for learning how types, units, and selectors behave.

## Updating and diagnosing

Run `foundryup` to update Foundry, then rerun the version checks and the full test suite. Do not update tooling in the same change as a contract behavior change: separating them makes a compilation or gas difference attributable.

If `forge build` fails after installation, first confirm the executable path with `which forge`, then check the working directory contains `foundry.toml`. If a compiler cannot be obtained, capture the full error, operating system, `forge --version`, and network conditions before changing project source. If a WSL-mounted directory behaves unexpectedly, retry a minimal project under the Linux home directory to distinguish a filesystem issue from a Solidity issue.

Foundry itself does not audit code. Fast compilation and good testing are feedback mechanisms; the design and security review process remain necessary.
