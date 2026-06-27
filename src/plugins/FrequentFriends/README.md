# FrequentFriends

Brings back Discord's removed "Frequently Contacted" list directly to your DM sidebar. Ranks friends by actual DM and voice activity using an exponential decay model, so recent interactions always matter more than old ones.

## Preview

<img width="593" height="669" alt="frequentfriendsscreenshot" src="https://github.com/user-attachments/assets/0011b1ad-a364-4fc8-a685-ecc264829800" /> <img width="590" height="674" alt="frequentscreenshot" src="https://github.com/user-attachments/assets/20d94c57-4f24-4d0b-a2d7-7eae8e30ce18" />



## Features

- **Smart Ranking:** Scores friends based on DM message frequency and voice co-presence time, with exponential decay so recent activity weighs more
- **Fire & Snowflake Badges:** Most frequent friend gets a 🔥 badge, least frequent gets a ❄️ badge
- **Presence-Aware:** Respects online/offline status with an option to include offline friends
- **Affinity Sync:** Optionally seeds initial scores from Discord's internal affinity store for a better cold-start experience
- **Per-Account Data:** Frequency data is stored separately per Discord account
- **Reset & Undo:** Wipe all data with a one-click reset, with a backup you can restore immediately

## Settings

| Setting | Default | Description |
|---|---|---|
| Custom Label | `Frequent Friends` | Title shown above the avatar row (max 30 chars) |
| Max Friends | `5` | How many avatars to show (3–10) |
| Show Offline | `off` | Include offline and invisible friends |
| Ignore Affinities | `off` | Skip Discord's affinity data, use only your own tracked interactions |
| Reset All Data | — | Wipes all tracked scores (saves a backup first) |
| Undo Reset | — | Restores your data from the latest backup |

## Data Storage

Frequency data is stored per-account in Vencord's DataStore under the key `FrequentFriends_<userId>`.

The `FrequencyData` object uses abbreviated field names (`ds`, `vs`, `dl`, `vl`, `af`) to reduce storage size. **Do not rename these fields** without a migration step — existing entries will silently lose their scores.
