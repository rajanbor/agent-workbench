# Open Cube product vision

Open Cube is a local-first workbench for running, observing and coordinating AI agents. It is not a chat application with several model buttons. Chat, terminal, canvas and logs are views over the same execution system.

## Product promise

One desktop application should let a person see where agents run, what they can access, which task each agent owns and what needs approval. It must work locally without an account. Cloud services are optional additions for remote access, device pairing and encrypted sync.

## Principles

- **Workspaces first.** A repository or folder has a machine, sandbox and sessions.
- **Provider-neutral agents.** An agent selects a provider and model; it is never represented by a provider-specific UI type.
- **Explicit authority.** Filesystem, network, shell, secrets, delegation and budget are visible before a run.
- **Local-first.** No account, telemetry or hosted control plane is required for local work.
- **One protocol.** Local and remote machines use the same daemon protocol.

## Non-goals for the first release

No autonomous deployment, hidden cloud sync, general code editor replacement, or VM implementation. Those follow only after reliable sessions, terminal handling and sandbox policy exist.
