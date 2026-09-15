# ADR 004: local and remote machines use one protocol

## Decision

The local computer is a `Machine` with a local `workbenchd`, not a special GUI-only code path.

## Consequences

Remote scheduling, model discovery and mobile control can reuse the same objects. Pairing and encrypted transport are mandatory before remote execution.
