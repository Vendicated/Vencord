# QuestTracker

QuestTracker is a tiny Vencord plugin that keeps an eye on Discord’s **Quests** tab and lets you know when something new drops – including **Orb** quests.

No fake gameplay, no weird HTTP spam, no “auto quest” nonsense. It just watches the quest list the client already has and pokes you when there’s something worth looking at.

---

## Features

- 🔔 **New quest alerts**
    Get a notification when a quest appears that you haven’t seen before.

- 🪙 **Orb vs non-Orb awareness**
    Tries to recognise when a quest rewards Orbs so you can prioritize the good stuff.

- 🕒 **Offline catch-up** (optional)
    On startup, can tell you about quests that appeared while your client was closed.

- 🧠 **Per-user memory**
    Remembers which quests you’ve already been told about, so you don’t get spammed on every reload.

- 🧼 **Read-only by design**
    Doesn’t send heartbeats, doesn’t spoof running games or streams, and doesn’t touch quest progress.

---

## Settings

You’ll find the settings under **Vencord → Plugins → QuestTracker**:

- **Notices**
    Also show a banner at the top of Discord when a new quest is detected.

- **Notify Orb Quests**
    Turn notifications for Orb-rewarding quests on/off.

- **Notify Non-Orb Quests**
    Turn notifications for everything else on/off.

- **Offline New Quests**
    On startup, compare against your last session and notify about quests that appeared while you were offline.

- **Debug Log Quests On Startup**
    Dev toggle. Logs the quest store and a sample quest object to the console to make it easier to inspect Discord’s quest shape.

---

## How it works (short version)

- Resolves the internal **Quests store** via `findLazy`, matching on `getQuest` + `quests`.
- Reads from `store.quests` and filters out:
  - Preview quests
  - Not-yet-started quests (`startsAt` in the future)
  - Expired quests (`expiresAt` in the past)
  - Completed quests
- Keeps a per-user set of known quest IDs in `DataStore`.
- Every ~60s:
  - Reads the current active quests.
  - Diffs against the known IDs.
  - Notifies for anything new, tagging Orb quests when it can.

No UI patches, no HTTP calls, just a bit of bookkeeping and some notifications.

---

## Notes

- Obviously relies on Discord’s internal quest data structures, so if Discord reshuffles those, this may need an update.
- If you don’t have the Quests feature / Orbs in your region or account, the plugin will basically sit idle.
