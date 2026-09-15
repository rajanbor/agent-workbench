# Spec: terminal panel

Acceptance: the workspace has a bottom dock with one tab per sandbox terminal;
the dock is toggled with `⌘J`, resized by dragging its top edge and hidden
without losing its buffer; each pane names its sandbox, shell, working
directory and the policy that governs it; engine-backed commands answer from
the snapshot; every other command is refused with the reason and a pointer to
`help`.

## Commands answered today

`help`, `status`, `agents`, `sandboxes`, `models`, `cost`, `ask <question>`,
`clear`. They are answered by `engine::inspector` under the inspector policy and
report model, tokens and cost like any other answer.

## Live execution

A live pty must run as the sandbox user, not as the desktop user, and is owned
by `workbenchd`. Until then the pane states this in its policy line and refuses
execution. The shell must never spawn a process on the desktop account to make
a terminal "work".
