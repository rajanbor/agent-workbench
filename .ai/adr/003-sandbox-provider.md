# ADR 003: sandbox provider interface

## Decision

Define a `SandboxProvider` interface before adding container or remote execution. Native-user isolation, containers, remote hosts and future VMs implement that interface.

## Consequences

The UI configures a policy and sees capabilities rather than shell commands. A provider must declare unsupported policy features instead of silently weakening isolation.
