# Implementation plan: Phase 1 workbench shell

## Linked work

GitHub issues #5, #6, #7 and #8; specs `specs/WORKBENCH_SHELL.md`,
`specs/INSPECTOR_MODEL.md`, `specs/TERMINAL_PANEL.md`,
`specs/CANVAS_WORKFLOW.md`, `specs/MODEL_CATALOG.md` and
`specs/USAGE_ACCOUNTING.md`.

## Thin vertical slice

A native Tauri window over the Rust engine: chat-first workspace backed by the
in-app inspector, collapsible object rails, terminal dock, canvas workflow
editor, sandbox boundary view, model catalogue with pinned versions, usage
accounting, command palette and status bar. State comes from
`desktop_snapshot`; the browser preview reads a snapshot generated from the same
Rust code.

## Boundaries

No provider is launched, no pty is attached, no sandbox is created, no workflow
is run and no remote state is claimed. Workflow layout and theme are persisted
in local storage only. Every blocked control states its reason.

## Verification

`pnpm --dir web test:engine`, `pnpm --dir web build`, and
`pnpm --dir web tauri dev` for review in the native window: translucent
chrome, traffic lights over the top bar, rails and dock toggling with `⌘B`,
`⌘J`, `⌘I`, an inspector answer reporting model, tokens, cost and refusals, and
a terminal refusing a command that needs a live pty.
