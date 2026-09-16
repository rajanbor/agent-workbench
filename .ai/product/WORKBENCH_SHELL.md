# Workbench shell specification

## Layout

1. Top bar: brand and workspace menu, version control menu (branch, head,
   recent commits, pinned model versions), chat model picker, a cost chip that
   carries tokens and the state source in its tooltip, panel toggles and
   appearance. In the native window it is also the drag region and leaves room
   for the traffic lights.
2. Left rail: the workbench chat pinned on top, then collapsible sections —
   Agents, Sandboxes, Terminals, Workflows, Models — each row showing live
   state, and the account menu pinned at the bottom.
3. Workspace: the active surface. An open agent adds a workspace bar with its
   project, branch, working tree and chats. Chat is the default; canvas, sandbox
   visualisation, model catalogue, usage, agent detail and settings share it.
4. Terminal dock: bottom panel with one tab per sandbox terminal, resizable and
   dismissible without losing its buffer.
5. Right rail: the workbench API — values, functions, modules and the inspector
   policy, each in a collapsible section. Starts closed, like the dock.
6. Status bar: branch, sandbox, running agents, state source and cost. Five
   facts; the rest belongs to Usage.

`⌘K` command palette · `⌘B` left rail · `⌘J` terminals · `⌘I` right rail.

## Required interactions

- Open a chat with the in-app inspector or with any agent, and read on every
  answer which model, which version, how many tokens and what it cost.
- Move between an agent, its sandbox, its model and its spend without losing
  the selection.
- Inspect a sandbox as a boundary drawing: machine, user account, mounts,
  network policy, processes and attached agents.
- Edit a workflow on the canvas: drag, rename, link, delete, pan, zoom, reset.
- Run engine-backed commands in a terminal pane; be refused, with a reason, for
  anything that needs a live pty.
- Read the workbench API — values, functions, modules — and the scopes the
  in-app model is granted or refused.

## Disclosure

Rail rows are one line; counts, timestamps and answer provenance appear on
hover; refusals and redactions are always visible. Nothing may shift layout when
it appears. See `.ai/adr/007-quiet-shell-and-native-window.md`.

## Boundaries

The shell renders engine state and never invents an object. Controls for
capabilities that are not implemented say so instead of failing silently. The
application chrome is not dockable; the dockable panel model in
`.ai/specs/DOCKING_LAYOUT.md` applies to the session work surface.
