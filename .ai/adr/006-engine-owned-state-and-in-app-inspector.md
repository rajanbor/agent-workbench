# ADR 006: engine-owned state and the in-app inspector

## Status

Accepted

## Context

The shell needed richer objects than the first snapshot exposed: agents with
their model and sandbox, sandbox isolation detail, a model catalogue with
versions, terminal sessions, a workflow graph, capability listings and spend.
Two paths were possible: grow the TypeScript mock in the front end, or grow the
Rust engine and let every client read the same value.

At the same time the main window should answer "what is this workbench doing?"
without a provider login, and without becoming a hole in the isolation model.
An in-app model that can inspect sandboxes is useful precisely because it is
dangerous: whatever it can read, it can also summarise into a place the user
did not expect.

## Decision

**State lives in Rust.** `crates/core` owns the domain, the prototype state,
the inspector and the accounting. The front end renders and never invents an
object. Tauri exposes `desktop_snapshot` and `inspector_ask`. The browser
preview reads `src/data/prototype-snapshot.json`, generated from the same Rust
code by `pnpm fallback`, so the preview cannot drift from the engine.

**The inspector is policy-first.** `InspectorPolicy` lists scopes, and the
inspector reads only granted ones. Today the granted set is agents, sandboxes,
models and usage; workspace files, provider credentials and terminal input are
refused, and a refusal is reported in the answer instead of being silent. Every
answer is passed through a redaction list before it is returned, and carries
its sources, token count and cost. The shipped inspector is rule-based and
produces no network traffic; attaching a local or API model later replaces the
generator, never the policy.

**Every model has an identity and a pinned version.** A `ModelCard` carries an
icon, an accent, a version and a digest, plus its revision history. The same
identity is used in the chat, the catalogue, the usage table and the rails, and
the pinned version appears in the top-bar version-control menu next to the
branch. A model is version-controlled state, not a free-form string.

**Execution stays blocked, visibly.** The terminal dock answers engine-backed
commands (`status`, `agents`, `sandboxes`, `models`, `cost`, `ask …`) and
refuses everything else with the reason: a live pty must run as the sandbox
user and belongs to `workbenchd`. The canvas edits a workflow locally and
cannot run it.

## Alternatives considered

- Keep growing the TypeScript mock. Rejected: two sources of truth, and the
  policy would live in the renderer, which is the least trustworthy place for
  it.
- Ship a real local LLM in the first pass. Rejected for now: the value of this
  window is the scoped bridge, and a model can be attached behind it once the
  scopes and redactions are proven.
- Give the inspector file access so it can explain code. Rejected: file
  contents are exactly what the sandbox exists to contain.
- Spawn real shell processes from the desktop client. Rejected: that would
  execute as the desktop user and bypass the agent account boundary.

## Consequences

The engine crate is the place to add state, and it carries tests: agent/model
and agent/sandbox references must resolve, workflow edges must connect existing
nodes, usage totals must match their rows, every model must pin a version, and
the inspector must refuse credentials and file contents. A UI feature that
needs new state starts in Rust and regenerates the preview snapshot.

## Migration and compatibility

`desktop_snapshot` gained fields; no field was removed. The Swift macOS app and
`agentctl` are untouched and remain the supported execution path.
