# Engineering conventions

## Code

- Rust owns portable domain, daemon, runtime and security-sensitive logic.
- Tauri/React renders state and invokes daemon commands; it does not own execution authority.
- Providers, sandbox engines and machines are interfaces with explicit capability reporting.
- Use stable IDs, versioned payloads and idempotency keys for commands/events.
- Keep secrets in platform secure storage; store references in project state.

## Tests

- Add focused unit tests for domain validation and state transitions.
- Add integration tests at process, sandbox and protocol boundaries.
- Test denied permissions and reconnect/replay paths as carefully as success paths.
- Do not add tests that merely duplicate implementation details.

## Security

- Default deny for filesystem scope, network, secret access, tool calls and delegation.
- Surface effective permissions in Inspector.
- No passwords in UI, logs, config, command arguments or issue bodies.
- Remote execution requires explicit machine selection or a transparent Auto policy.
