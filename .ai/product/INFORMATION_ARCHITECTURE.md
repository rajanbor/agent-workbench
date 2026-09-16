# Information architecture

## Primary objects

`Machine → Runtime → Sandbox → Workspace → Session → Agent → Task → Run`.

Models and providers are capabilities used by an agent, alongside skills, prepared patterns and MCP servers; an agent's `AgentBlueprint` records which of them it was given, and the library describes each one. A terminal is a view of a sandbox or agent run. Canvas is a graph view of those same objects.

## Desktop navigation

Navigation is three columns. The activity strip names the areas — agents, search, source control, sandboxes, models, workflows — and the sidebar shows whichever one is lit, in collapsible sections. Selecting an object opens it in the work area; it never replaces the shell.

The work area holds tabs in groups, so two surfaces — chat, canvas, sandbox, models, usage, agent, agent studio or settings — can be read at once. The terminal dock sits beneath it and the workbench API rail (values, functions, modules, inspector policy) beside it. Both start closed. The status bar reports branch, sandbox, running agents, state source and cost; the rest of the accounting lives in Usage.

Detail is disclosed, not displayed: see `.ai/adr/007-quiet-shell-and-native-window.md`.

## Empty and onboarding states

Marketing copy belongs only in onboarding and an empty workspace. A configured installation opens the most recent workspace and its active panels.
