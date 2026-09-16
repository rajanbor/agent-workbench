# Spec: agent studio

Acceptance: an agent can be designed, not only read. Designing one is five
questions — purpose, project, model, sandbox, review — each answered by
clicking a card rather than filling a field, with the next question unlocked as
the current one is answered, any answered step revisitable from its own chip,
and the draft kept when the panel is left and reopened. The review step states
what the agent would be allowed to do before it exists. The editor exposes the blueprint —
instructions, patterns, skills, MCP servers and engine tools — with every
choice made from a library that explains itself. Permissions are derived from
the choices and shown, including the ones that are blocked. Nothing is claimed
to persist: edits are a local draft until `workbenchd` owns persistence.

## Purpose

`domain::AgentPurpose` is a prepared starting point: a role, a suggested name,
instructions, and the patterns, skills, servers and tools that go with them.
Choosing one fills the blueprint, and the review step shows what it filled,
each line marked with what it is. Everything a purpose names must exist in the
library, and a test enforces that — the wizard is a shortcut through the
editor, never a second source of truth.

A purpose also carries `model_note`: one line about what the work needs of a
model, shown above the model cards, so the choice is informed rather than
alphabetical. The cards themselves show where a model runs, whether it is ready
and what it costs — per token, per month or in electricity.

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
outside browser storage. The new-agent draft is restored before it is saved
back, so reopening the panel continues the design instead of erasing it.
