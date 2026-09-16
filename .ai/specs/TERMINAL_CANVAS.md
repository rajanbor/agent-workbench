# Spec: terminal canvas

Acceptance: a board holds as many terminals as the work needs, each in a window
that can be opened in a chosen sandbox, moved, resized, raised, closed and
tidied into columns; every window names its terminal, sandbox, working
directory and the policy that governs it; the arrangement is restored on the
next start; a terminal shown both on the board and in the bottom panel has one
history, not two; and typing a program's name opens a session in that window
that takes a task per line until `exit`.

## One terminal, one buffer

`web/src/lib/terminal.ts` owns what a terminal does with what is typed, and the
shell holds the buffers keyed by terminal id. The bottom panel and every board
window are two views of the same terminal, so a session started in one is
visible in the other, and `clear` clears it once.

A window is a placement, not a terminal: `lib/board.ts` remembers where it
sits, and the terminal itself comes from the engine or is built from the
sandbox it belongs to — account, mount and network policy included.

## Programs

`domain::TerminalProgram` declares what a terminal can start: `claude`,
`codex`, `qwen`, `agentctl`. Each names the model and provider it would use,
the banner it prints, example tasks, and `blocked_by` — the reason its real
binary cannot be launched. A test asserts `available` and `blocked_by` are
opposites, so a program can never claim to run without saying what is missing.

None of them runs today. A program in a sandbox runs as the sandbox user, which
is `workbenchd`'s work, and for a hosted model the provider is not connected
either. What opens instead is a session against the built-in inspector under
the read-only policy, and the banner states that on every start — not once, not
in a tooltip. Every answer carries the model that produced it, its tokens and
its cost, exactly as in the chat.

`claude "a task"` answers once from its argument and stays in the session, the
way the real CLI takes a first prompt. Inside a session every line is a task,
including lines that look like shell commands. `exit` closes it.

## Persistence

Positions, sizes and which sandbox each window belongs to are kept on this
machine. Transcripts are not: a session that outlives the window would be a
session this app never had, and the daemon is what will own one. A restored
window opens at the shell prompt with its policy, claiming nothing about what
was said before.
