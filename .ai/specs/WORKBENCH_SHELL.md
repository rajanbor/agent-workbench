# Spec: workbench shell

Acceptance: the app opens a persistent IDE-style shell; activity selection updates the secondary sidebar; inspector can collapse; status bar renders a model-backed summary; empty state appears only with no workspace; all centre panels derive from a panel registry.

## Prototype status

The first prototype is implemented in `desktop/src/App.tsx`. It renders the shell, contextual explorer, mock panel registry, split view, collapsible Inspector and status bar using explicitly labeled local mock state. Persistence and daemon-backed workspace state remain pending work.
