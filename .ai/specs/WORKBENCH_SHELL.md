# Spec: workbench shell

Acceptance: the app opens on a chat backed by the in-app inspector; the left
rail lists agents, sandboxes, terminals, workflows and models in collapsible
sections and reflects live state; the right rail lists values, functions and
modules with the inspector policy; the account menu is reachable from the bottom of the
left rail; opening an agent shows its project, branch, working tree and chats,
and can start another chat; the terminal dock opens, resizes and hides without
losing its buffer; the canvas edits a workflow; the sandbox view draws
the isolation boundary; the model catalogue shows each model's identity, pinned
version and revisions, and version control is reachable from the top bar; usage
reports tokens and cost per model, per agent and per day; light and dark themes
render every view from the token file; the native window is translucent, drags
by its top bar and leaves room for the traffic lights; rail rows stay one line
with detail on hover, the API rail and dock start closed, and no disclosure
shifts layout; every control for an unimplemented capability reports why.

## Prototype status

Implemented in `desktop/src/`, split into `components/`, `views/`, `lib/`,
`data/` and `styles/`. State comes from the Rust engine
(`desktop_snapshot`, `inspector_ask`) under Tauri, and from the generated
`src/data/prototype-snapshot.json` in a browser preview; the status bar and the
top bar name which source is in use.

Run it natively with `pnpm tauri dev`; the browser preview is for quick
iteration and labels itself "preview snapshot".

Related specs: `AGENT_STUDIO.md`, `INSPECTOR_MODEL.md`, `TERMINAL_PANEL.md`, `CANVAS_WORKFLOW.md`,
`MODEL_CATALOG.md`, `USAGE_ACCOUNTING.md`. Decisions:
`.ai/adr/005-shell-navigation-and-theming.md`,
`.ai/adr/006-engine-owned-state-and-in-app-inspector.md`.

Not implemented: launching providers, live ptys, running workflows, persisting
notes or workflows beyond local storage, and remote machines.
