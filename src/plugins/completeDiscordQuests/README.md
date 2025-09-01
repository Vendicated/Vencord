# CompleteDiscordQuests

Completes your active Discord Quest automatically.

Warning: This may violate Discord's Terms of Service. Use at your own risk.

## Features
- Supports the main Quest tasks:
  - WATCH_VIDEO / WATCH_VIDEO_ON_MOBILE
  - PLAY_ON_DESKTOP (desktop app only)
  - STREAM_ON_DESKTOP (desktop app only; requires at least one more person in the voice channel)
  - PLAY_ACTIVITY (sends heartbeats while in a call/VC)
- UI button in the call control bar (next to mic/deafen): "Complete Discord Quest"
- Slash command: `/completeQuest`

## Usage
- Join a call (for the UI button) or trigger the command from any chat.
- The plugin will try to detect your active uncompleted Quest and complete it.
- Progress and completion notifications are shown as toasts.

## Notes
- Non-video quests require the Discord desktop app.
- For STREAM_ON_DESKTOP, at least one other participant is required in the voice channel.
- The plugin restores any spoofed states and unsubscribes from events after completion.

## Credits
- Original concept/script by amia.
- Plugin adaptation for Vencord & BetterDiscord by Aqualunem.
