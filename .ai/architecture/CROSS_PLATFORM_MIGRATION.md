# Cross-platform desktop migration

`web/` and `crates/` is the new desktop client. It uses Tauri 2, React and TypeScript for the interface, with Rust behind the command boundary. Tauri produces native bundles for macOS, Windows and Linux from the same project.

## Shared engine

`crates/core` contains the portable domain model: provider state, sessions, local-model catalogue and a read-only host profile. It has no shell commands, elevated privileges or macOS APIs. The Tauri client calls it through `desktop_snapshot`.

## Platform adapters

The old Swift product's macOS account isolation cannot be copied verbatim to other systems. The next phase will implement a common runtime-adapter interface with platform-specific policy.

| Platform | Planned adapter |
| --- | --- |
| macOS | Existing standard `agent` user flow, migrated after parity tests |
| Windows | Standard Windows account or restricted process; no administrator default |
| Linux | Unprivileged user and optional container runtime |

Docker remains an explicit runtime choice. It must be detected and configured before it can launch a session. Provider connections will use each provider's supported login or API-token flow and will not store passwords in the app.

## Run locally

```sh
cd desktop
pnpm install
pnpm tauri dev
```

The initial cross-platform client is a safe read-only engine and UI skeleton. It intentionally does not start provider CLIs or containers yet; the working Swift application remains the production macOS implementation during migration.
