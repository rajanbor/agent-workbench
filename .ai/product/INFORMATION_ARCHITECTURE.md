# Information architecture

## Primary objects

`Machine → Runtime → Sandbox → Workspace → Session → Agent → Task → Run`.

Models and providers are capabilities used by an agent. A terminal is a view of a sandbox or agent run. Canvas is a graph view of those same objects.

## Desktop navigation

The left rail exposes the objects: the workbench chat, agents, sandboxes, terminals, workflows and models, in collapsible sections. Selecting one changes the workspace surface; it never replaces the shell.

The workspace holds one surface at a time — chat, canvas, sandbox, models, usage, agent or settings — with the terminal dock beneath it and the workbench API rail (values, functions, modules, inspector policy) beside it. Both start closed. The status bar reports branch, sandbox, running agents, state source and cost; the rest of the accounting lives in Usage.

Detail is disclosed, not displayed: see `.ai/adr/007-quiet-shell-and-native-window.md`.

## Empty and onboarding states

Marketing copy belongs only in onboarding and an empty workspace. A configured installation opens the most recent workspace and its active panels.
