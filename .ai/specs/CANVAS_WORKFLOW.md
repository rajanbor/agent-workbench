# Spec: canvas — workflow and schema

Acceptance: the canvas renders the engine workflow as nodes and edges; a node
can be dragged, renamed, selected and deleted; an edge is created by starting a
link from one node and choosing another; the background pans and the view
zooms; the layout persists locally and can be reset to the engine layout; node
kinds are trigger, agent, sandbox and output, and each shows its status.

## Schema mode

The same surface has a second mode that reads the workbench as a relational
schema. An agent is an object: its own key, foreign keys to the model and the
sandbox it runs on, values for project, branch and revision, and join rows for
the skills, patterns and MCP servers it was given. Sandboxes, models and the
library are the tables those keys point at, and a relation is drawn from the
key row to the header of the table it names.

Agents that share a sandbox are framed as a group, so "these agents work
together" is visible without reading a field. Selecting a table reports how
many relations point at it and how many it points out.

The schema is derived from the snapshot in `web/src/lib/schema.ts` — positions
included — so it cannot describe an object the engine does not have. Panning,
zooming and selection are shared with the workflow mode.

## Ownership

The engine owns the workflow shape (`Workflow`, `WorkflowNode`, `WorkflowEdge`).
Local edits are a working copy in browser storage; they never reach another
machine. Persisting a workflow for real, validating it against the domain model
and running it all belong to `workbenchd` and the agent runtime.

## Running

A workflow cannot be run from the desktop client yet. The run control states
that instead of failing silently.
