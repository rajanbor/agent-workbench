# System architecture

```
Desktop UI / mobile command centre
              │ local IPC or authenticated network protocol
              ▼
          workbenchd
  ├─ Agent manager     ├─ Sandbox manager
  ├─ Terminal manager  ├─ Machine manager
  ├─ Provider manager  ├─ Storage
  └─ Event bus
```

The Rust daemon owns execution and state transitions. Tauri is a desktop client, not a privileged runtime manager. The existing Swift app remains the supported macOS execution implementation until an adapter has equivalent safety tests.

Suggested layout: `apps/desktop`, `crates/core`, `crates/protocol`, `crates/agent`, `crates/orchestration`, `crates/providers`, `crates/sandbox`, `crates/machines`, `crates/runtime`, `crates/terminal`, `crates/storage`, `crates/sync`, and `daemon/workbenchd`.
