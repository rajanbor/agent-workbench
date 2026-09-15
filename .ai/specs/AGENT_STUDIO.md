# Spec: agent studio

Acceptance: an agent can be designed, not only read. Basic mode takes a name, a
role, a project folder, a model and a sandbox, and states what the agent would
be allowed to do before it exists. The editor exposes the blueprint —
instructions, patterns, skills, MCP servers and engine tools — with every
choice made from a library that explains itself. Permissions are derived from
the choices and shown, including the ones that are blocked. Nothing is claimed
to persist: edits are a local draft until `workbenchd` owns persistence.

## Blueprint

`AgentBlueprint` in the engine is the contract: `instructions`, plus id lists
for `patterns`, `skills`, `mcp` and `tools`. Every id must resolve in `Library`
or `Capabilities`, and an engine test enforces it. The studio edits a draft of
that value; the draft is stored per agent in browser storage and can be reset to
the blueprint the engine ships. A draft that differs says so.

## Library

The library is the explanation, not a list of switches. Every entry carries a
name, a summary in one sentence, a longer detail that says how it behaves, and
what it requires:

- **Patterns** shape a run — review before write, one change per run, test
  before propose, approval for shell, read only, report findings. A pattern
  changes how work is done, never what the agent knows.
- **Skills** are packaged abilities with requirements. A skill that is not
  installed is shown as needing setup, and its requirement is reported as
  blocked rather than dropped.
- **MCP servers** are tool servers with declared scopes and a transport. A
  blocked server (for example an HTTP fetch under a limited network policy)
  stays visible with its reason.
- **Engine tools** are the functions the workbench exposes, with their
  permission — `read` tools work today, `execute` tools wait on the runtime.

## Derived permissions

The studio shows what the chosen set would require of the sandbox, attributing
each requirement to the skill or server that asked for it. A requirement whose
source is not installed or is blocked is marked blocked. The studio never
grants anything: it describes what would have to be granted.

## Boundaries

Creating an agent, saving a blueprint and choosing a folder from the system
dialog all need `workbenchd`; each control says so. The studio writes nothing
outside browser storage.
