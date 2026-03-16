# Command Action Authoring

Use typed `actions(ctx)` on each command entry.

For execute-style secondary actions, use `createExecuteSecondaryAction(...)` from `actionHelpers.ts` so shortcut labels and action-key intents stay consistent.

New command actions should be added in the command definition file and not in `CommandPaletteModal.tsx`.
