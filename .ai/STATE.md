# Current state

Open Cube has two clients during migration:

- The Swift macOS app is the current supported execution path. It launches Codex and Claude through a dedicated standard macOS `agent` account and uses `agentctl`.
- `desktop/` is the cross-platform Tauri + React client. It ships the workbench shell in light and dark themes: a chat-first main window backed by the in-app inspector, collapsible agent/sandbox/terminal/workflow/model rails, a workbench-API rail, a terminal dock, a canvas workflow editor, a sandbox boundary view, a model catalogue with pinned versions, and usage accounting. All of that state is owned by the Rust engine in `desktop/engine` and read through `desktop_snapshot` / `inspector_ask`; a browser preview reads a snapshot generated from the same Rust code. The client runs as a native, translucent macOS window (`pnpm tauri dev`); the browser preview is for iteration and labels itself. It still does not launch providers, ptys, Docker or workflows, and every such control says so.

The product is alpha software. No account is required for local use. Docker, remote machines, Canvas, delegation, encrypted sync and mobile are planned work, not implemented features.

The active implementation backlog is `.ai/roadmap/ROADMAP.md` and GitHub issues #4–#21.
