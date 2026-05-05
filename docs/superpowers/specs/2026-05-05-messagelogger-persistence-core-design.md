# MessageLogger Persistence — Phase 1: Core

**Date:** 2026-05-05
**Plugin:** `src/plugins/messageLogger/`
**Status:** Design approved, awaiting implementation plan

## Context

Vencord's `MessageLogger` plugin is currently in-memory only. It augments Discord's `MessageCache` with `deleted` / `editHistory` / `firstEditTimestamp` markers via runtime patches; once a message leaves the cache (channel switch, reload, GC), the augmentation is lost.

This phase ports the core persistence behavior from BetterDiscord's [MessageLoggerV2](https://github.com/1Lighty/BetterDiscordPlugins/tree/master/Plugins/MessageLoggerV2): captured deletes and edits survive client reloads, and the existing inline UI (red strikethrough deletes, click-to-view edit history) keeps working both during the session and after reload.

This is phase 1 of a 5-phase rollout (see `memory/project_messagelogger_persistence_phases.md`).

## Goals

- Captured deletes and edits survive client reload.
- Inline UI (red strikethrough on deletes, click-to-view edit history) keeps working after reload exactly as it does pre-reload.
- Works identically on browser, desktop, and Vesktop builds — no native dependencies, no platform feature gates in this phase.
- No new npm dependencies (Vencord plugin rule, `CONTRIBUTING.md`).
- Existing in-memory `MessageCache` patches are not removed or rewritten — persistence layers underneath them.

## Non-goals (deferred to later phases)

- Viewer modal for browsing the log (phase 2).
- Saved-message pinning (phase 3).
- Attachment / image caching (phase 4).
- JSON export / import (phase 5).

## Architecture

Three layers. Each can fail independently without taking down the others (graceful degradation back to current in-memory-only behavior).

### 1. Capture layer (existing code, lightly augmented)

The current patches and Flux event handlers in `src/plugins/messageLogger/index.tsx` already detect deletes and edits and mutate `MessageCache` in-place. The augmentation: at the same point where they mutate the cache, they also enqueue a write event to the persistence layer. Existing logic is otherwise untouched.

### 2. Persistence layer (new — `persistence.ts`)

Owns the IndexedDB connection, schema, and read/write API. All operations are async. Writes are debounced and batched; reads are direct.

Public API (used by capture and restore layers):

```ts
function enqueueDelete(message: Message): void
function enqueueEdit(message: Message, oldMessage: Message): void
function getEntriesForChannel(channelId: string, opts?: { since?: number }): Promise<PersistedMessage[]>
function removeEntry(messageId: string): Promise<void>
function purgeMatching(predicate: (e: PersistedMessage) => boolean): Promise<number>
function runRetentionPurge(): Promise<void>
function flushSync(): void  // best-effort sync flush for beforeunload
```

### 3. Restore layer (new — `restore.ts`)

Subscribes to the Flux events `LOAD_MESSAGES_SUCCESS` and `CHANNEL_SELECT`. After Discord commits its message payload to `MessageStore`, the restore layer queries the persistence layer for entries in that channel and merges them into the cache via `MessageCache.update`.

## Storage

### Why not `@api/DataStore`

`@api/DataStore` is `idb-keyval` — pure key-value, no secondary indexes. We need indexed lookups by `channelId` (for per-channel restore) and by `capturedAt` (for retention purge). Loading the full log into memory and filtering in JS would work for small logs but degrades as the log grows.

This plugin therefore opens its own raw IndexedDB database, separate from Vencord's main store.

### Schema

- **Database:** `VencordMessageLogger` (separate from `VencordData` to avoid bloating the main store)
- **Object store:** `messages`
  - `keyPath: "id"` (Discord message ID, snowflake string)
  - **Indexes:** `channelId`, `guildId`, `capturedAt`, `deleted`
- **Object store:** `meta` (key-value)
  - Keys used in this phase: `"version"` (schema version, integer), `"lastPurgeAt"` (ms epoch)

### Data model

```ts
interface PersistedMessage {
    id: string;                      // Discord message ID (PK)
    channelId: string;               // indexed
    guildId?: string;                // indexed; undefined for DMs
    capturedAt: number;              // ms epoch when WE first captured this entry; indexed
    deleted: boolean;                // indexed
    message: PlainMessage;           // see note below
    editHistory?: { timestamp: number; content: string; }[];
    firstEditTimestamp?: number;     // ms epoch
}
```

`message` stores the entire Discord `Message` payload so the inline UI has everything it needs (author, attachments metadata, embeds, etc.) without re-fetching. Two notes:

1. **POJO, not class instance.** IndexedDB's structured clone strips class identity, so what we read back is a plain object with `Message`-shape, not an instance of Discord's `Message` class. The restore layer reconstructs a real instance before injecting (see *Ghost construction* below).
2. **Date↔number translation.** Discord's in-memory `Message` uses `Date` objects for `timestamp` / `editedTimestamp` / `editHistory[].timestamp` / `firstEditTimestamp`. We persist as `number` (ms epoch) for stable serialization, then convert back to `Date` on read. Helper functions `serialize(message)` / `deserialize(plain)` in `persistence.ts` own this conversion.

Schema version lives in the `meta` object store (`meta.version`), authoritative for the whole DB. Per-record version field is intentionally omitted; future migrations rewrite all records.

## Capture flow

When the existing `handleDelete` decides not to ignore a message and is about to mutate the cache to set `deleted=true`:

1. Existing path runs unchanged: cache is mutated.
2. Additionally: `persistence.enqueueDelete(message)` is called.

`MESSAGE_DELETE_BULK` (the channel-purge path in `handleDelete` with `isBulk=true`) iterates `data.ids` and calls `enqueueDelete` once per non-ignored ID, same way it currently calls the in-memory mutate.

When the existing `MESSAGE_UPDATE` patch sets a new `editHistory` on a cached message:

1. Existing path runs unchanged: cache is mutated with the new `editHistory`.
2. Additionally: `persistence.enqueueEdit(newMessage, oldMessage)` is called.

### Write buffer

`enqueueDelete` / `enqueueEdit` push events into an in-memory buffer. The buffer flushes on whichever happens first:

- A 500 ms debounce timer expires after the most recent enqueue.
- The buffer reaches 256 events.
- A `beforeunload` event fires (best-effort sync flush — IndexedDB is async, so this attempts a `readwrite` transaction synchronously; if the browser cuts us off, those events are lost, which is acceptable for this data class).

Within a flush:

- Events are coalesced by message ID (last-write-wins). A delete after an edit for the same ID becomes a single delete entry; an edit after an edit merges histories.
- All puts happen in a single `readwrite` transaction.

## Restore flow

Two flux subscriptions, both run **after** Discord's own handlers commit their payloads:

### `LOAD_MESSAGES_SUCCESS`

```
on LOAD_MESSAGES_SUCCESS({ channelId, messages, ... }):
  // messages is the array Discord just committed to MessageStore
  if messages is empty: return
  oldestId = minBySnowflake(messages.id)   // BigInt comparison, see note
  oldestTs = snowflakeToMs(oldestId)
  entries = persistence.getEntriesForChannel(channelId, { since: oldestTs })
  for entry in entries:
    if MessageStore.getMessage(channelId, entry.id) exists:
      // Edit case — message came back from Discord; reattach our history
      MessageCache.update(channelId, entry.id, m => m
        .set("editHistory", deserializeEditHistory(entry.editHistory) ?? m.editHistory)
        .set("firstEditTimestamp", entry.firstEditTimestamp ? new Date(entry.firstEditTimestamp) : m.firstEditTimestamp))
    else if entry.deleted:
      // Ghost case — Discord didn't return this message; inject it
      injectGhostMessage(channelId, entry)
  MessageStore.emitChange()
```

**Snowflake comparison.** Discord IDs are 17–19 digit numeric strings — naïve string compare can misorder a 17-digit ID against an 18-digit one. Convert to `BigInt` for comparison, or use the `id_to_ms = (BigInt(id) >> 22n) + DISCORD_EPOCH` formula to get a numeric `oldestTs` directly.

**Ghost construction.** IndexedDB returns POJOs, not `Message` instances. To inject a ghost we need a real instance so it merges cleanly with `MessageCache`. Strategy: opportunistically grab a constructor reference from any live message in the cache (`anyMsg.constructor`), the same pattern Vencord's `MessageUpdater.ts` already uses (`new oldMessage.constructor(oldMessage)`). On startup, before the first live message arrives, defer ghost injection until either a live message is available or fall back to importing the `MessageRecord` class via webpack lookup. `injectGhostMessage(channelId, entry)`:

1. Get a `MessageRecord` constructor (cached after first lookup).
2. Build a fresh `Message` instance from `deserialize(entry.message)`.
3. Set `deleted=true`, `editHistory` (deserialized), `firstEditTimestamp` (Date).
4. Mark all attachments as `deleted=true` (matches existing in-memory behavior).
5. Use `MessageCache.update(channelId, ...)` to add it. Discord's cache orders by snowflake ID, so the ghost falls into the correct chronological position automatically.

### `CHANNEL_SELECT`

Some channel opens hit a cached message list and skip `LOAD_MESSAGES_SUCCESS`. To cover that:

```
on CHANNEL_SELECT({ channelId }):
  if channelId is null: return
  cached = MessageStore.getMessages(channelId)
  if cached is empty or cached.loadingMore: return  // wait for LOAD_MESSAGES_SUCCESS
  apply same merge logic as LOAD_MESSAGES_SUCCESS, using cached as the source array
```

A short per-channel debounce (250 ms) prevents double-restore when both events fire in quick succession.

## Retention / purge

A purge pass runs:

- 5 seconds after plugin start (deferred so plugin start isn't blocked on it).
- After every Nth write-buffer flush (N=20) — opportunistic, prevents unbounded growth during heavy capture.
- On a manual menu action (settings UI: "Purge old logs now").

Purge logic:

1. Read settings: `persistRetentionDays`, `persistRetentionCount`.
2. Open a cursor on the `capturedAt` index, ordered ascending (oldest first).
3. Walk the cursor:
   - If both `persistRetentionDays` and `persistRetentionCount` are 0 → stop (purge disabled).
   - Else delete the entry if either: it's older than `now - persistRetentionDays * 86400000`, OR total count is still above `persistRetentionCount`.
   - Stop when neither condition triggers a delete.
4. Write `meta.lastPurgeAt = now`.

Phase 3 will introduce a `saved: boolean` flag; the cursor walk will skip entries with `saved=true`. Phase 1 placeholder: no entries are saved, so the predicate is always false.

## Settings

Added to the existing `definePluginSettings({...})` block in `index.tsx`:

| Key | Type | Default | Notes |
|---|---|---|---|
| `persistEnabled` | BOOLEAN | `true` | Kill switch — disabling stops new writes but keeps existing DB so re-enabling restores everything. |
| `persistRetentionDays` | NUMBER | `30` | `0` disables time-based purge. |
| `persistRetentionCount` | NUMBER | `10000` | `0` disables count-based purge. |
| `restoreInline` | BOOLEAN | `true` | If `false`, persistence still writes/reads but no inline ghost injection. Keeps current session UX, defers visible recovery to phase-2 viewer. |

A setting `onChange` handler fires a retroactive purge when `ignoreUsers`, `ignoreChannels`, or `ignoreGuilds` change, removing entries matching the new ignore patterns.

## Ignore-list interaction

The existing `shouldIgnore` runs before any of our new code, so new captures already respect ignore rules without changes. The new piece: when ignore settings change, sweep already-persisted entries:

```
on ignoreUsers/ignoreChannels/ignoreGuilds change:
  schedule via requestIdleCallback (setTimeout(0) fallback in older builds):
    persistence.purgeMatching(entry => shouldIgnore(deserialize(entry.message)))
```

## Error handling

- IDB open failure → log via `Logger("MessageLogger")`, set `persistence.disabled = true`. The capture and restore layers no-op when disabled. The plugin gracefully degrades to current in-memory-only behavior. No user-facing crash, no error toast.
- Write transaction failure → log, drop the buffered batch (don't retry — could indicate quota exhaustion).
- Read transaction failure during restore → log, skip restore for that channel only; do not throw.
- Schema version mismatch (DB `meta.version` > code's current version) → set `persistence.readOnly = true`, log warning. Reads still work, writes are skipped. Forward-compatibility hatch for users downgrading from a future Vencord.

## Browser / desktop split

None this phase. IndexedDB is available identically on browser, desktop, and Vesktop. No `IS_DISCORD_DESKTOP` checks added.

## Acceptance criteria

Manual test plan (Vencord has no automated harness for plugin behavior):

1. Delete a message → fully reload Discord (Ctrl+R) → reopen that channel → the message is still there with red strikethrough.
2. Edit a message → reload → click the edit marker → modal shows all prior versions including the original.
3. Add a user to `ignoreUsers` who has previously logged entries → within ~5 seconds, those entries are gone from the DB (verify by reload + reopen).
4. Set `persistRetentionDays = 1` and `persistRetentionCount = 0`; manually advance the captured-at value of a test entry to >24h ago via devtools; trigger purge → entry is gone.
5. Disable the plugin → DB persists on disk → re-enable → all entries reload on next channel open.
6. Open devtools → `indexedDB.databases()` shows `VencordMessageLogger` with the expected schema and indexes.
7. With ~1000 captured entries, opening a channel adds <100 ms perceived latency over baseline.

## Files

- `src/plugins/messageLogger/index.tsx` — add capture-hook calls in `handleDelete` and the edit patch's replacement code, register flux listeners on plugin `start`, add new settings (~40 lines added, nothing removed).
- `src/plugins/messageLogger/persistence.ts` *(new)* — IDB connection, schema setup, write buffer, public read/write/purge API.
- `src/plugins/messageLogger/restore.ts` *(new)* — flux event subscriptions, channel-restore merge logic, ghost injection.
- `src/plugins/messageLogger/types.ts` *(new)* — `PersistedMessage` type and other shared types.

No native files. Phase 1 is fully browser-compatible.

## Open considerations for later phases

- Phase 2 (viewer) will need a global iteration API; persistence layer should expose `getAllEntries(filter, sort, paging)` then.
- Phase 3 (saved messages) will add a `saved: boolean` field to `PersistedMessage` and a `saved` index. Schema migration: bump `meta.version` to 2; on open, run `onupgradeneeded` to add the index, then a one-time migration cursor to default-fill `saved=false` on existing records.
- Phase 4 (attachments) will add an `attachments` object store keyed by attachment ID, plus an `attachmentBlobIds: string[]` field on `PersistedMessage`.
- Phase 5 (export/import) builds on the public iteration API from phase 2.
