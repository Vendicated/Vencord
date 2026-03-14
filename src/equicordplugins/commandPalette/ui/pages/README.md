# Command Page Authoring

Add a new page command in three steps.

1. Register a command with `createCommandPageCommand({ ..., page: { id: "your-page-id" } })`.
2. Add a `PalettePageSpec` in `ui/pages/specs/`.
3. Add the spec to `ui/pages/registry.ts`.

The modal uses the page registry and page stack automatically, so normal pages do not require `CommandPaletteModal.tsx` edits.

Action routing follows the typed `actions(ctx)` model in `CommandEntry`.

For command-specific secondary actions, define typed intents on the command and avoid modal branching.
