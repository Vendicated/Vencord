# MentionManager

Smart-read irrelevant pings and jump between your mentions.

## What it does

**Smart Mention Read** (off by default) automatically marks as read the
mentions you probably don't care about — `@everyone`, `@here`, role
mentions that don't include you, and mentions of other users — so the red
notification badge doesn't stick around for noise. Direct mentions of you,
replies to your messages, and DMs are never auto-acked unless you
explicitly allow it.

**Mention History** keeps a local index of your direct mentions, replies,
and broadcasts, so you can jump back to them later — even across restarts.

**Go to Mention** navigates to your most recent mention, then steps to
older (or newer) ones on repeated use:
`/mention-last`, `/mention-prev`, `/mention-next`, channel/server context
menus, or the Vencord toolbox.

## How Smart Read works

1. Every incoming message (`MESSAGE_CREATE`, plus `MESSAGE_UPDATE` for
   late-added mentions) is classified from structured Discord fields —
   `mentions`, `mentionEveryone`, `mentionRoles`, `messageReference` —
   matched against your user id. Usernames are never string-matched.
2. Messages in an enabled category are grouped per channel and acked once
   after a short debounce, using the client's own `BULK_ACK` dispatch
   (same shape as ReadAllNotificationsButton).
3. Before acking, cached messages between the last ack and the candidate
   are scanned for direct mentions/replies. If one is found the ack is
   skipped — read state never advances past an unread direct mention.

## Settings

- **Smart Mention Read**: `enableSmartRead` (default **off**),
  `ignoreEveryone`, `ignoreHere`, `ignoreRoles`, `ignoreOtherUsers`,
  `preserveDirectMentions`, `preserveReplies`, `preserveDMs`
  (all preservation defaults **on**)
- **Mention Navigation**: `enableMentionNavigation`, `circularNavigation`
- **History**: `persistentHistory`, `maxEntries` (default 300),
  `retentionDays` (default 30), `clearHistory`
- **Advanced**: `debugLogging`

## Limitations

- `@everyone` and `@here` share a single `mention_everyone` flag in
  Discord's payload, so they cannot be told apart reliably and are always
  handled together.
- The index only learns mentions observed while Discord is open (plus
  whatever is already in the local message cache on connect). Mentions
  from while Discord was closed show up once you visit the channel; the
  plugin never fetches history automatically.
- Jumping to a mention whose message is no longer cached lands you on the
  channel with a notice instead.

## Privacy & storage

Fully local. Only message/channel/guild/author ids, the mention type, and
timestamps are stored — never message content. Persistence uses Vencord's
`DataStore` (IndexedDB) under `mentionManager_index_v1`. No network
requests, no telemetry, no external services.
