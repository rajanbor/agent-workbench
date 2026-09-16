# Spec: agent runtime and the account boundary

Acceptance: a launch is described before it happens. `crates/runtime` turns a
request into a plan — program, arguments, account, working directory and a
built environment — or refuses it with the rule it broke. Execution is blocked
until `workbenchd` owns the privileged helper, and the block is stated in the
plan rather than discovered at run time.

## The boundary

The boundary is the operating-system account. An agent runs as a separate
standard user with no access to the desktop user's home, keychain or session.
A sandbox therefore carries the account that backs it (`Sandbox.account`); the
sandbox's own name is a label and must never be used as the account.

## Rules, each with a test that tries to break it

- **Never the desktop account.** A request whose account equals the account
  running the binary is refused.
- **No root, no nonsense.** Empty names, `root`, names with whitespace and
  names starting with `-` are refused.
- **Inside the workspace.** The working directory is compared by path
  components, not by string prefix, so `…/open-cube/../../.ssh` is refused as
  an escape rather than passed as a prefix match.
- **The environment is built, never inherited.** The plan carries exactly
  `HOME`, `USER`, `SHELL`, `PATH`, `OPEN_CUBE_WORKSPACE` and
  `OPEN_CUBE_AGENT`. Anything whose name looks like a credential — `TOKEN`,
  `SECRET`, `PASSWORD`, `API_KEY`, `CREDENTIAL` — is refused outright, as are
  session variables such as `SSH_AUTH_SOCK`.

## Adapters

`host_runtime()` returns the adapter for the machine. macOS builds the
account-switching plan; other platforms return `Unsupported` with the reason,
so a caller never silently gets nothing. Adding Windows and Linux means adding
an adapter, not changing the contract.

## The command

`open-cube` reads the workbench (`status`, `agents`, `sandboxes`, `models`,
`cost`, `activity`, `ask`) and shows what a launch would do (`plan <agent>
[start|terminal|stop]`). `run` attempts it and reports the refusal with its
reason. `doctor` lists what still blocks a real run — today: no provider signed
in, and no `workbenchd`.

This replaces what `agentctl` does for reading and planning. Retiring the Swift
client (#33) additionally needs execution, sessions and the installer.
