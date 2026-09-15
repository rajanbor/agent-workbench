# Workbench shell specification

## Layout

1. Activity bar: fixed narrow icon rail.
2. Secondary sidebar: contextual tree for the chosen activity.
3. Centre: tab strip and dockable panels.
4. Inspector: optional right rail.
5. Status bar: compact live execution summary.

## Required interactions

- Create, close, reorder and select tabs.
- Split a panel right or down.
- Move a panel between groups; maximize and restore a group.
- Persist layout per session locally.
- Open a Command Palette for navigation and panel commands.

Phase 1 may use mock data and static panel content, but all component APIs must accept IDs from the domain model rather than provider names or view-specific objects.
