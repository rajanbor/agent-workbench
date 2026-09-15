# Desktop engine

`desktop/engine` is a pure Rust crate: it reads no network, spawns no process
and holds no credential. Every desktop client reads the same value from it, so
macOS, Windows and Linux cannot drift apart, and the policy that matters lives
below the renderer.

## Modules

| Module | Responsibility |
| --- | --- |
| `engine::domain` | Object model: machine, providers, models, agents, sandboxes, sessions, terminals, workflow, capabilities, usage, version control, inspector policy. |
| `engine::state` | Deterministic prototype snapshot, labeled as prototype in the UI. |
| `engine::inspector` | Scoped, redacting summariser behind `InspectorPolicy`. |

`snapshot()` returns the whole workbench as one immutable value; `inspect()`
answers a question under the policy.

## Tauri surface

| Command | Returns |
| --- | --- |
| `desktop_snapshot` | `DesktopSnapshot` |
| `inspector_ask(question)` | `InspectorAnswer` with text, model id, sources, redactions, refusals, tokens and cost |

## Preview snapshot

`pnpm fallback` runs `cargo run --example dump` and writes
`desktop/src/data/prototype-snapshot.json`. The browser preview reads that file,
so it shows exactly what the engine would return. Regenerate it in the same
change whenever `engine::state` changes.

## Tests

`pnpm test:engine` (or `cargo test`) covers: providers stay disconnected without
a login, every agent resolves to a known model and sandbox, workflow edges
connect existing nodes, usage totals match their rows, every model pins a
version and digest, and the inspector refuses credentials and file contents.
