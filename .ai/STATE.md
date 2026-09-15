# Current state

Open Cube is one cross-platform system, described in
`.ai/adr/008-one-cross-platform-system.md`:

- `crates/core` owns the domain, the prototype workbench state and the
  inspector policy. It is platform neutral and carries the tests.
- `crates/app` is the Tauri window for macOS, Windows and Linux. It exposes
  `desktop_snapshot` and `inspector_ask`.
- `web/` is the client: Next.js, React and TypeScript exported statically, in light and dark themes, with a
  chat-first main window backed by the in-app inspector, object rails, a
  terminal dock, a canvas workflow editor, a sandbox boundary view, a model
  library, usage accounting and the agent studio.
- The Swift macOS app and `agentctl` remain the only working execution path
  until `crates/runtime` and `crates/cli` replace them (#32), after which the
  Swift client is retired (#33).

The product is alpha software. No account is required for local use. Launching
providers, live ptys, Docker, running workflows, remote machines, delegation,
encrypted sync and mobile are planned work, not implemented features, and every
control for them says so.

The active backlog is `.ai/roadmap/ROADMAP.md` and GitHub issues #4-#33.
