# Spec: terminal panel

Acceptance: the workspace has a bottom panel with three tabs — `Problems`,
`Output` and `Terminal`; it is toggled with `⌘J`, resized by dragging its top
edge, maximised to fill the work area and restored to the height it had, and
hidden without losing any buffer. In `Terminal` the sessions are listed down
the side, one row per sandbox terminal naming its sandbox and state, and the
open one is marked; each session states its shell, working directory and the
policy that governs it once, at the head of its own log. The prompt is the last
line of the stream, not a bar beneath it. Engine-backed commands answer from the
snapshot; every other command is refused with the reason and a pointer to
`help`.

## Commands answered today

`help`, `status`, `agents`, `sandboxes`, `models`, `cost`, `ask <question>`,
`clear`. They are answered by `engine::inspector` under the inspector policy and
report model, tokens and cost like any other answer.

## Problems

Read from the snapshot the window already holds, never invented, and every row
names the path it came from: models that are not ready, providers that are not
connected, skills whose permission is missing, MCP servers that are blocked,
sandboxes without an account of their own, and engine modules that are planned
rather than built. Errors first, then warnings, then what is merely worth
knowing. A tab that is permanently empty would be furniture; this one reports
the same refusals the rest of the app reports, gathered in one place.

## Output

Everything this window has told the person in this session — refusals, reasons
and confirmations — kept after the toast that carried it has gone. It is held
in memory only: durable logs belong to `workbenchd`, and the tab says so.

## Live execution

A live pty must run as the sandbox user, not as the desktop user, and is owned
by `workbenchd`. Until then the pane states this in its policy line and refuses
execution; a new terminal and a split terminal report the same reason. The
shell must never spawn a process on the desktop account to make a terminal
"work".
