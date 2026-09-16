# ADR 005: shell navigation and theming

## Status

Partly superseded. The token system, the two themes and the no-remote-assets
rule stand. The single-sidebar navigation described below was replaced by the
rails and chat-first workspace in `.ai/adr/007-quiet-shell-and-native-window.md`
and `.ai/product/WORKBENCH_SHELL.md`.

## Context

The first shell prototype copied the VS Code chrome: a narrow activity rail, a
contextual explorer, a tab strip over dockable panels and a right inspector.
Four columns of chrome left little room for the objects themselves, the
inspector repeated what the centre already showed, and the panel registry was
carrying mock content rather than domain state. The prototype also shipped a
single dark palette with hardcoded hex values and a Google Fonts import, which
contradicts the local-first, no-network principle.

## Decision

The desktop shell uses one navigation sidebar and a master/detail content area.

- The sidebar merges the activity rail and the explorer: workspace switcher,
  search, grouped navigation with counts, and a footer with the theme control
  and the local account.
- Each activity renders a full-width view. Object detail — revisions,
  permissions, snippets, notes — lives in the detail column of that view rather
  than in a separate inspector rail.
- The top bar carries the breadcrumb, the object identity and the object's
  primary actions. The status bar keeps the live execution summary.
- Colour, typography, radius and shadow come from `desktop/src/styles/tokens.css`
  as CSS custom properties, defined once per theme. Light and dark are both
  first-class: `data-theme` pins one, its absence follows the system.
- Accent blue marks primary and selected; green, amber and red mark object
  state only. No component hardcodes a colour value.
- The shell loads no remote asset: system typefaces and inline SVG icons only.

## Alternatives considered

- Keep the activity rail and dockable panels. Rejected for this phase: three
  levels of navigation chrome before any object is visible, and docking has no
  session content to dock until the runtime lands.
- Ship one dark theme. Rejected: the client targets macOS, Windows and Linux,
  where following the system appearance is expected behaviour.
- Use a component library for theming. Rejected: a token file plus plain CSS
  keeps the bundle dependency-free and auditable.

## Consequences

Docking is not deleted, it is deferred: `.ai/specs/DOCKING_LAYOUT.md` now
applies to the session work surface (chat, terminal, diff, logs) that Phase 2
adds inside the session view, not to the application chrome. The inspector
requirement in `.ai/specs/WORKBENCH_SHELL.md` is replaced by the detail column.
New views must consume tokens and domain IDs; a colour literal or a web font in
`desktop/src/` is a review failure.

## Migration and compatibility

`desktop/src/App.tsx` was rewritten into `components/`, `views/`, `data/`,
`lib/` and `styles/`. No Rust, engine or Swift interface changed; the shell
still reads the read-only `desktop_snapshot` command and falls back to labeled
prototype state in a browser preview.
