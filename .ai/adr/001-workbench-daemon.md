# ADR 001: introduce workbenchd

## Decision

Use a Rust daemon, `workbenchd`, as the owner of runs, terminals, sandboxes, machines and events. Desktop clients communicate with it over a local IPC protocol or authenticated remote transport.

## Consequences

The UI becomes replaceable and remote machines use the same control path. Daemon APIs require authentication, storage migrations and event replay from the beginning.
