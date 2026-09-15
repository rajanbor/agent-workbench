# Changelog

## Unreleased

- Rebuild the cross-platform desktop shell: chat-first main window, collapsible
  agent / sandbox / terminal / workflow / model rails, a workbench-API rail,
  a terminal dock, a command palette (`⌘K`) and a status bar that names its
  state source.
- Add light and dark themes driven by one token file, following the system
  appearance unless a theme is pinned; the stored choice applies before paint.
- Move desktop state into the Rust engine: agents, sandboxes with mounts,
  network policy and processes, a model catalogue with pinned versions and
  digests, terminal sessions, the workflow graph, the workbench API listing,
  usage accounting and version control, all covered by engine tests.
- Add an in-app inspector: the main chat answers from the engine snapshot under
  a read-only policy, reports model, version, tokens, cost and the objects it
  read, refuses workspace files, credentials and terminal input, and redacts
  secret terms. No answer leaves the machine.
- Add a terminal dock (`⌘J`) that answers engine-backed commands per sandbox and
  refuses anything needing a live pty, a canvas workflow editor with drag, link,
  zoom and pan, a sandbox boundary visualisation, a model catalogue with version
  control, and a usage and cost view.
- Turn the model catalogue into a library: each model carries a summary, what
  it is good at, its requirements, its licence and one reference — Hugging Face
  for open weights, the provider's API documentation for hosted models — opened
  in the system browser, with filters for local, API and ready-to-use.
- Give every model its own icon, accent, pinned version and revision history;
  surface version control in the top bar next to the branch.
- Generate the browser preview snapshot from the engine (`pnpm fallback`) so the
  preview cannot drift from Rust.
- Drop the Google Fonts import and bundled icon assets; the shell makes no
  network request and draws its icons inline.
- Ship the shell as a native window: transparent macOS window with
  `underWindowBackground` vibrancy, overlay title bar, the top bar as drag
  region, and translucent chrome that follows the window material.
- Paint the app's own theme as the ground in the native window and sync the
  window appearance with it, so a light theme stays light on a dark desktop;
  raise the blur and lower the transparency of every chrome layer.
- Add the account menu at the bottom of the left rail, a workspace bar for an
  open agent (project, branch with switcher, working tree, chats) and one line
  of context — model, state, branch — under each agent.
- Quiet the interface: one-line rail rows, answer provenance and counts on
  hover, a five-item status bar, the workbench API rail and terminal dock closed
  on first run, and safety flags — refusals and redactions — always visible.
- Remove leftovers from the previous shell: dead components, unused primitives
  and dead CSS rules, plus the stale layout descriptions in `.ai/`.
- Record the decisions in `.ai/adr/005`, `.ai/adr/006` and `.ai/adr/007`, with
  specs for the inspector, terminal, canvas, model catalogue and usage
  accounting.

## 0.1.0-alpha.6

- Reframe the macOS app as an agent desktop with a conversation-oriented sidebar and system modules.
- Inspect the local Mac to show laptop or desktop type, chip, memory, logical cores and free storage.
- Add a local model catalog with transparent 4-bit resource estimates and compatibility checks.
- Add connections UI for Codex, Claude Code, Gemini preparation and explicit macOS-user or Docker runtime selection.

## 0.1.0-alpha.5

- Name parallel agent sessions to organise multiple Terminal windows and their native control panels.

## 0.1.0-alpha.4

- Create Codex, Claude and Terminal sessions from a dedicated native sessions view.
- Each tracked session has its own Open Cube control window with state, project context and stop action.
- Refresh the workspace dashboard and public product preview.

## 0.1.0-alpha.3

- Connect GitHub through the official GitHub CLI and choose an accessible personal, organisation or collaborator repository from the app.
- Import private repositories through the main account's macOS Keychain without exposing credentials, `origin` or Git credential configuration to the agent account.

## 0.1.0-alpha.2

- GitHub Pages download page with one universal macOS `.pkg` for Apple Silicon and Intel.
- Native macOS Installer installs the app into /Applications without privileged scripts.
- In-app first-run guide opens account/tool setup and provider login without typed commands.
- User-scoped launcher is prepared and updated when the installed app starts.
- CI installs the universal package on a disposable Mac and verifies its bundled setup.

## 0.1.0-alpha.1

- Native macOS project browser and shared Swift CLI.
- Codex/Claude/terminal launch under a separate standard agent account.
- Canonical workspace checks, independent Git copies and tracked sessions.
- Explicit startup errors, SIGTERM stop, non-secret environment variables.
- Preview-first macOS setup, user-local app and agent-tool installers.
- Apache-2.0, security policy and CI on Apple Silicon and Intel.

Known limits: no enforced network sandbox, no automatic Lando query, no
notarization, no guarantee of stopping daemonized descendants, no independent
security audit. Interactive login and macOS consent remain user-controlled.
