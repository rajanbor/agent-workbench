# Implementation plan: Phase 1 workbench shell

## Linked work

GitHub issues #5, #6, #7 and #8; specs `specs/WORKBENCH_SHELL.md` and `specs/DOCKING_LAYOUT.md`.

## Thin vertical slice

Render an IDE-style Tauri workspace using mock domain summaries. It has an activity bar, contextual explorer, panel registry, tabs, a split workspace, collapsible inspector and model-backed status bar.

## Boundaries

No provider is launched, no terminal receives input, no sandbox is created and no remote state is claimed. Layout is persisted locally in browser storage only for the prototype.

## Verification

Run `pnpm --dir desktop build` and `pnpm --dir desktop tauri build --bundles app`. Manually verify activity changes, tabs, split, inspector collapse and status information.
