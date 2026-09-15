# ADR 008: one cross-platform system

## Status

Accepted

## Context

Open Cube was two products in one repository. A Swift macOS application with
`agentctl` owned the working execution path — launching Codex and Claude as a
separate standard macOS user — and a second, cross-platform client existed
beside it as a preview. Every decision had to be taken twice, the domain model
lived in two languages, and the macOS boundary logic could not be reused on
Windows or Linux, where the same guarantees still have to be made.

## Decision

One system. The product is a Rust workspace with a single web client:

```
crates/core     domain, prototype state, inspector policy   (platform neutral)
crates/app      the Tauri window                            (macOS, Windows, Linux)
crates/runtime  agent execution and the account boundary    (planned, #32)
crates/cli      the `open-cube` command                     (planned, #32)
web/            Next.js + React + TypeScript client, statically exported
```

- Platform differences live inside `crates/runtime` as adapters behind one
  contract, not in a second client. Cross-platform means one system with
  adapters, not one product per platform.
- The client is web technology in a native window: React and TypeScript, built
  by Next.js with `output: "export"`, rendered by Tauri. There is one interface
  and it is the same on every platform. The export is static on purpose: the
  product ships no Node server, so nothing in the client may depend on one, and
  anything touching `window` must survive prerendering.
- Rust owns state, policy and execution. TypeScript renders and never decides
  what an agent may do.
- The Swift client is retired once `crates/runtime` and `crates/cli` cover
  launching, sessions, diagnostics and the account boundary (#32, #33). It is
  not deleted before that: it is the only thing that currently launches an
  agent safely, and removing it first would ship a regression.

## Alternatives considered

- Keep the Swift app for macOS and the web client elsewhere. Rejected: the
  security boundary would be implemented twice, and the two would drift.
- Native UI per platform (SwiftUI, WinUI, GTK). Rejected for this product: the
  workbench is dense, text-heavy and identical on every platform, and three
  interfaces would cost more than the native feel is worth here. The window is
  still native, with the platform's own material and controls.
- A browser application with a local daemon. Rejected: the boundary depends on
  the desktop session and the local account; a browser tab weakens it and
  invites remote exposure.

## Consequences

`cargo test -p open-cube-core` and `pnpm build` are the two checks every change
runs; the app crate is built where its platform toolchain exists. New state
starts in `crates/core`. The installer, the download page and the macOS CI jobs
follow the Tauri bundle once #33 lands, and `docs/SECURITY.md` is rewritten
around the Rust runtime at that point.

## Migration and compatibility

`desktop/engine` became `crates/core`, `desktop/src-tauri` became `crates/app`,
and `desktop/src` became `web/src`. The Swift targets, the installer scripts
and the macOS CI jobs are untouched by this step, so the shipped macOS app
keeps working while the runtime is ported.
