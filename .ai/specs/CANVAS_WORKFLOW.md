# Spec: canvas workflow

Acceptance: the canvas renders the engine workflow as nodes and edges; a node
can be dragged, renamed, selected and deleted; an edge is created by starting a
link from one node and choosing another; the background pans and the view
zooms; the layout persists locally and can be reset to the engine layout; node
kinds are trigger, agent, sandbox and output, and each shows its status.

## Ownership

The engine owns the workflow shape (`Workflow`, `WorkflowNode`, `WorkflowEdge`).
Local edits are a working copy in browser storage; they never reach another
machine. Persisting a workflow for real, validating it against the domain model
and running it all belong to `workbenchd` and the agent runtime.

## Running

A workflow cannot be run from the desktop client yet. The run control states
that instead of failing silently.
