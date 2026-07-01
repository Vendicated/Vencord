# TempIgnore

Temporarily ignore a Discord user for a specified duration. While ignored, the user is hidden across your entire Discord client — their messages, DMs, status, friend list presence, and voice channel membership all disappear. When the timer expires, everything automatically reverts.

## Features

- **⏱ Timed ignoring** — Set a specific duration (1h, 6h, 12h, 1d, 3d, 7d, or custom hours/days)
- **💬 Message hiding** — Messages from ignored users are hidden in all server channels
- **📨 DM hiding** — DM conversations with ignored users are hidden from the sidebar
- **🟢 Status hiding** — Ignored users appear as offline (presence updates are suppressed)
- **👥 Friend list hiding** — Ignored users are hidden from your friends list
- **🔊 Voice hiding** — Ignored users are hidden from voice channel member lists
- **⏰ Auto-expiry** — Ignores automatically expire after the set duration with a toast notification
- **⚙️ Per-feature toggles** — Enable/disable each hiding feature independently in settings
- **Right-click integration** — Access via right-click → "⏱ Temp Ignore" on any user

## Usage

1. Right-click any user in a server, DM, or friend list
2. Click **"⏱ Temp Ignore"**
3. Select a preset duration or enter a custom one
4. Click **Confirm**

The user will be hidden until the timer expires. To manually unignore, right-click the user and select **"⏱ Unignore"** (shows remaining time).

## Settings

| Setting | Description | Default |
|---|---|---|
| Show Expiry Toast | Notification when a temp-ignore expires | ✅ |
| Hide Messages | Hide messages in server channels | ✅ |
| Hide DMs | Hide DM channels from sidebar | ✅ |
| Hide Presence | Show ignored users as offline | ✅ |
| Hide Friend List | Hide from friend list | ✅ |
| Hide Voice | Hide from voice channel members | ✅ |

## Important Notes

- This is **client-side only** — the ignored user can still see you and send messages; they just won't appear on your end until the timer expires.
- This is **NOT** the same as Discord's built-in block feature. No server-side action is taken.
- If you disable and re-enable the plugin, all active temp-ignores are preserved.
