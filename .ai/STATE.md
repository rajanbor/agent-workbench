# Current state

Open Cube has two clients during migration:

- The Swift macOS app is the current supported execution path. It launches Codex and Claude through a dedicated standard macOS `agent` account and uses `agentctl`.
- `desktop/` is the cross-platform Tauri + React client. Its Rust engine currently exposes read-only machine, provider, model and session state; it does not launch providers, Docker or sandboxes yet.

The product is alpha software. No account is required for local use. Docker, remote machines, Canvas, delegation, encrypted sync and mobile are planned work, not implemented features.

The active implementation backlog is `.ai/roadmap/ROADMAP.md` and GitHub issues #4–#21.
