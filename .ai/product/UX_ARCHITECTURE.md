# UX architecture

Open Cube is a desktop application, and the window is part of it: translucent
panels over the macOS window material, hairline borders, small quiet type and a
single accent. Interface text uses the system sans-serif; terminals, hashes and
IDs use a monospace face. The shell loads no remote font or icon asset.

## Quiet by default

A surface shows identity and state. Everything else waits for a hover, a
selection, or the view that owns it — see
`.ai/adr/007-quiet-shell-and-native-window.md`.

- Rail rows are one line: name, plus a status dot where state matters. Counts
  and timestamps appear on hover. An agent row is the exception: it carries one
  context line — model, state and branch — because that is the object's state,
  not decoration.
- Answer provenance — model, version, tokens, cost — appears on hover; sources
  open from a count. Refusals and redactions are always visible.
- The status bar carries five facts: branch, sandbox, running agents, state
  source, cost. The accounting lives in Usage.
- The workbench API rail and the terminal dock start closed.
- Disclosure uses opacity, never `display`: nothing shifts under the cursor.

## Themes and material

Light and dark are equal citizens, defined once in
`desktop/src/styles/tokens.css`; `data-theme` pins a theme and its absence
follows the system. Chrome is drawn from the layer tokens
(`--layer-chrome`, `--layer-panel`, `--layer-float`) with a backdrop blur. In the native window (`data-runtime="tauri"`) the page paints a translucent
ground in the app's own theme and the macOS vibrancy stays a hint behind it;
the window appearance is synced with the chosen theme, so the system appearance
never decides how the app theme looks. The traffic lights sit over the top bar,
which is also the drag region.

Accent marks primary actions, selection and the active runtime. State colour is
reserved for state: green for running, ready and live; amber for waiting,
approval and limited permissions; red for failure; violet for planned. No
component hardcodes a colour.

## Model and agent identity

Every model carries an icon and an accent in the engine snapshot, so one model
looks the same in the chat, the catalogue, the usage table, the rails and the
canvas. Agents are drawn as a single round face in their own accent, so a list
of agents reads like a list of people, not a list of rows.

## Structure

The account lives at the bottom of the left rail: a round avatar, the local
profile and a menu for settings, shortcuts and appearance. It is static, always
reachable, and never covers the status bar.

Opening an agent adds a workspace bar above its chat: the project and its path,
the branch with a switcher, the working tree, and the chats held against that
agent with a control to start another.

The main window opens on a chat with the in-app inspector, so the first thing
the app shows is what the workbench is doing. The left rail holds collapsible
sections for agents, sandboxes, terminals, workflows and models; the right rail
holds the workbench API and the inspector policy; a terminal dock sits under the
workspace. Detail surfaces (model catalogue, agent) use a master/detail split.

## State

The UI must show real state and never invent an object. A running agent shows
state (`running`, `waiting`, `idle`, `approval`, `failed`), model, sandbox and
task. Prototype data is labeled where it is rendered, and a control for a
capability that does not exist yet says why instead of failing silently.
