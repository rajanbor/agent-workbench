# Security policy

Agent Workbench is experimental alpha software. It has not undergone an
independent security audit. The macOS account boundary depends on the actual
permissions of the host. This application is not a VM or a network sandbox.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/rajanbor/agent-workbench/security/advisories/new).
Do not disclose private paths, credentials, exploit details or personal data in
a public issue. Include the affected version, macOS version, reproduction steps,
expected boundary and observed behavior. Use synthetic files and accounts.

Only the latest alpha is maintained. There is no guaranteed response SLA.
Fixes should include a regression test and a changelog entry.

Read the [threat model and limits](docs/SECURITY.md) before running agents.
