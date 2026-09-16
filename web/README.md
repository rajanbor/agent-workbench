# Open Cube client

The interface of the one cross-platform system: Next.js, React and TypeScript
in a Tauri window over the Rust core in [`crates/core`](../crates/core). The
client is exported statically — there is no Node server in the product, and
nothing may depend on one. Run it as an
application, not as a page — commands come from the repository root:

```sh
pnpm install
pnpm app          # the window, against the dev server
pnpm app:build    # bundle for this platform
pnpm test         # cargo test --workspace
pnpm fallback     # regenerate the preview snapshot from Rust
pnpm dev          # browser preview, for quick iteration only
```

The core owns the state. In the browser preview the Tauri IPC is absent, so
the shell reads `src/data/prototype-snapshot.json` — generated from the same
Rust code by `pnpm fallback` — and the status bar says `preview snapshot`
instead of `rust engine`. Translucency and the overlay title bar exist only in
the native window, so visual review happens there.

## Surfaces

| Surface | What it does |
| --- | --- |
| Top bar | Workspace menu, version control (branch, head, commits, pinned model versions), chat model picker, tokens and cost, panel toggles, appearance |
| Activity strip | One icon per area — agents, search, source control, sandboxes, models, workflows — with settings and the account at its foot |
| Sidebar | The lit area, in collapsible sections: workbench chat and agents with their chats, search, branch and working tree, sandboxes and terminals, the catalogue, workflows |
| Work area | Tabs in groups. Any tab splits to the right, drags between groups, and the whole arrangement is restored on the next start |
| Projects | A folder as a tab: path, branch, working tree, files and agents; "Open in editor" names the command it would run; new projects come from a template, a folder or a repository |
| Chat | Main window. The in-app inspector answers from the engine snapshot and reports model, version, tokens, cost, sources and refusals |
| Canvas | Workflow editor: drag, rename, link, delete, pan, zoom, reset to the engine layout |
| Sandboxes | Isolation drawn as nested boundaries with mounts, network policy, processes and attached agents |
| Models | Catalogue with per-model identity, pinned version, digest and revision history |
| Usage | Spend and tokens per model, per agent and per day |
| Bottom panel | `Problems` (what the snapshot says is broken, with its source), `Output` (everything this session reported), `Terminal` (sessions down the side, prompt inside the stream); maximises and restores |
| Right rail | Workbench API: values, functions, modules, and the inspector policy |

Shortcuts: `⌘K` palette · `⌘B` sidebar · `⌘J` terminals · `⌘I` right rail ·
`⌘\` split · `⌘W` close the tab · `⌘1`–`⌘6` the areas of the strip.

## Structure

| Path | Contents |
| --- | --- |
| `../crates/core/src/domain.rs` | Object model shared by every client |
| `../crates/core/src/state.rs` | Deterministic prototype snapshot |
| `../crates/core/src/inspector.rs` | Scoped, redacting summariser |
| `../crates/app/src/lib.rs` | `desktop_snapshot` and `inspector_ask` commands |
| `app/` | Next App Router: root layout, the client page, the error boundary |
| `src/components/` | Top bar, activity strip, sidebar, editor groups, terminal dock, palette, primitives |
| `src/lib/layout.ts` | The tab model: groups, splitting, and what is restored |
| `src/views/` | Chat, canvas, sandboxes, models, usage, agent, settings |
| `src/lib/` | Engine bridge, identity, theme, shell types, highlighting |
| `src/styles/tokens.css` | Colour, type and radius tokens for both themes |
| `src/styles/app.css` | The import list; rules live in the files below |
| `src/styles/{base,chrome,shell,chat,canvas,panels,responsive}.css` | One file per surface, so parallel branches do not collide |

## Rules

- Quiet by default: a surface shows identity and state; counts, timestamps and
  answer provenance appear on hover; the API rail and the dock start closed;
  refusals and redactions are never hidden. Disclosure uses opacity, never
  `display`, so nothing shifts under the cursor.
- Chrome is drawn from the layer tokens with a backdrop blur; in the native
  window the page is transparent and the macOS material is the ground.
- State lives in Rust. A view renders the snapshot; it never invents an object.
  New state starts in `crates/core`, then `pnpm fallback` regenerates the preview.
- The in-app model reads only what `InspectorPolicy` grants, and every answer
  reports its model, version, tokens, cost, sources and refusals.
- Controls for capabilities that do not exist yet say why instead of failing
  silently. The client never spawns a process on the desktop account.
- No web fonts, icon fonts or CDN assets: the shell makes no network request.
- Everything that touches `window`, `localStorage` or `document` must be safe
  while Next prerenders the page: guard it, or keep it in an effect.
- Both themes ship from `tokens.css`; no component hardcodes a colour.
