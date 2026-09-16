# Spec: docking layout

Acceptance: the work area holds tabs in groups; a tab can be split to the
right, dragged into another group, closed with the mouse, the middle button or
`⌘W`, and focused by clicking it; an emptied group folds away unless it is the
last, which shows a watermark; the layout — groups, tabs, the lit activity, the
sidebar's width and whether it is open — is restored on the next start, and a
restored tab pointing at an object the engine no longer has is dropped rather
than rendered.

## Model

`lib/layout.ts` owns it. A `TabSpec` is identity (`key`), the view it renders,
its title, its icon and the id of the object it points at. A `Group` is an
ordered list of specs and the key that is showing. A `Layout` is the groups and
which one takes the next tab.

Every operation returns a new layout and none mutates its argument, so the
shell's state is one value that React can compare. A tab is constructed by one
of the builders in the same file — `agentTab`, `sandboxTab`, `modelTab` — so a
title and an icon are decided once, wherever the tab is opened from.

Opening a key that is already somewhere focuses it there rather than opening a
second copy: on a screen this size, two copies of one object are a bug, not a
feature.

## Limits

Three groups. Beyond that no pane is wide enough to read, so the split control
disappears instead of making unreadable panes.

## Persistence

Browser storage on this machine, under `open-cube.layout.v1`, read after mount
so the first render matches the prerendered HTML. It is a convenience: if
storage is unavailable the app opens on its default layout and says nothing.
Layouts shared between machines wait on the workbench daemon.
