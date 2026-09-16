# ADR 007: quiet shell and the native window

## Status

Accepted

## Context

The shell had become loud. Every list row carried a subtitle, the status bar
carried eight facts, every chat answer showed its model, tokens, cost and four
source badges at all times, and three rails were open on first run. All of it
was true and almost none of it was needed at the moment it was shown.

It was also being judged in a browser tab. Open Cube is a desktop application:
the window itself — its material, its title bar, how it sits on the desktop —
is part of the product, and a page in a browser frame hides exactly that.

## Decision

**Quiet by default.** A surface shows identity and state. Everything else waits
for a hover, a selection, or the view that owns it.

- Rail rows are one line: name, and a status dot where state matters. Counts and
  timestamps appear on hover.
- Answer provenance — model, version, tokens, cost — appears when the message is
  hovered; sources open from a count. Refusals and redactions are never hidden,
  because a scope the model could not read is part of the answer.
- The status bar carries five facts: branch, sandbox, running agents, state
  source, cost. Detail belongs to Usage.
- The workbench API rail and the terminal dock start closed. `⌘I` and `⌘J` open
  them.
- Reveal with opacity, never with `display`: nothing may shift under the cursor.

**Translucent chrome.** Top bar, rails, dock, menus, palette and toasts are
layers (`--layer-chrome`, `--layer-panel`, `--layer-float`) with a backdrop
blur, so the shell reads as a stack of panels over one material rather than a
grid of opaque boxes.

**The native window is the product.** `tauri.conf.json` sets a transparent
window with macOS `underWindowBackground` vibrancy, an overlay title bar and a
hidden title; the top bar is the drag region and leaves room for the traffic
lights. `index.html` sets `data-runtime="tauri"` before first paint, and the
tokens switch the page to transparent so the window material shows through.
Development and review run in that window — `pnpm tauri dev` — and the browser
preview is a convenience that labels itself "preview snapshot".

## Alternatives considered

- Keep everything visible and rely on the user to ignore it. Rejected: density
  is only a virtue when the dense thing is what you need right now.
- Collapse detail behind clicks instead of hover. Rejected for provenance: a
  click per message to learn which model answered is friction on the common
  path; hover costs nothing.
- Use the `window-vibrancy` crate for the material. Rejected: Tauri's built-in
  `windowEffects` does the same with no extra dependency.
- Draw custom window controls. Rejected: the platform's own traffic lights are
  the correct control, and an overlay title bar keeps them.

## Consequences

A new element in the chrome has to earn its place: if it is not identity, state
or a safety flag, it is disclosed, not displayed. Colour and material stay in
`tokens.css`; a view never blurs or tints on its own. Visual review happens in
the native window, because translucency and the title bar do not exist in the
browser preview.

## Migration and compatibility

No engine or command change. `.ai/adr/005` set the token system and the two
themes, which stand; its navigation layout was replaced by the rails described
in `.ai/product/WORKBENCH_SHELL.md`.
