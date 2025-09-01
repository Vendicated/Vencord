# CompleteDiscordQuests ✨

Automate (or one-click) the completion of your Discord quests inside Vencord. Works with a discrete call bar button, optional toasts, and a safe single-run lock to avoid double-executions. Event-driven auto mode kicks in on startup and when you enroll/start a quest. 🎯

> Disclaimer: This can violate Discord's Terms of Service. Use at your own risk. For educational purposes only. 🙏

## What it does 💡

- Adds a “Complete Quest” button in the call control bar (toggleable)
- Provides a command to run quest completion manually
- Optional auto-complete that triggers:
	- Shortly after Discord starts (initial check)
	- When quests are fetched, updated, or you enroll in one (event-driven)
- Progress and result toasts (optional)
- Dynamic button icon:
	- Spinner while running ⏳
	- Check mark for ~3 seconds on success ✅

## Supported quest tasks ✅

- `WATCH_VIDEO` and `WATCH_VIDEO_ON_MOBILE`
- `PLAY_ON_DESKTOP`
- `STREAM_ON_DESKTOP`
- `PLAY_ACTIVITY`

Notes:
- Non-video quests require the desktop client (not the browser). 🖥️
- Stream-related quests may require at least one other user in the voice channel. 🎙️

## How it works (high level) ⚙️

- The plugin observes quest-related events and store changes and debounces calls to avoid excessive requests.
- For video quests, it posts realistic timestamps to `video-progress` until completion.
- For desktop play/stream quests, it uses a combination of event subscription, store polling, and heartbeat fallback to detect and finish.
- It prevents re-entrancy: if a run is in progress, clicking again only shows a progress toast.

## Installation & Build 🛠️

This plugin is part of the Vencord source tree (`src/plugins/completeDiscordQuests`). If you’re working with the repository locally:

```powershell
pnpm install
pnpm build
```

Then enable the plugin in Vencord Settings → Plugins.

## Usage 🚀

### Manual

- Click the “Complete Quest” button in the call control bar.
	- If a run is already in progress, you’ll get a status toast instead of starting a new run.
- Or use the command: `completeQuest` (via your commands UI).

### Auto-complete

- Toggle the setting “Auto-complete quests automatically”.
- The plugin will:
	- Run an initial check shortly after startup.
	- React to quest enroll/updates via events, with a small debounce.

## Settings ⚙️

- `Auto-complete quests automatically` (boolean)
	- Enables event-driven auto-completion on startup and quest changes.
- `Show toast notifications for progress and results` (boolean)
	- Enables toasts for progress and completion.
- `Shows a special button in the call control bar to complete quests manually` (boolean)
	- Show/hide the call bar button without restarting.

## Tips & Limitations 📌

- Non-video quests only work on the desktop client. The plugin will warn if you’re in a browser.
- Stream quests: you may need at least one other person in the voice channel for Discord to count progress.
- Discord changes happen: event names or store structure can change over time. The plugin also listens to store change events as a fallback.
- Rate limits: the plugin uses conservative intervals and debouncing to reduce risk, but you’re still responsible for usage.

## Troubleshooting 🧰

- Button not visible:
	- Ensure the plugin is enabled in Vencord Settings → Plugins.
	- Toggle the “call bar button” setting on/off; it updates live.
- Auto doesn’t trigger:
	- Ensure the `Auto-complete` setting is enabled.
	- Enroll in a quest, wait a few seconds (debounce), and check.
	- Restart Discord and try again.
- Stuck running / no completion:
	- Open DevTools and check the console for `[CompleteDiscordQuests]` logs.
	- Verify you’re on desktop for non-video quests.
	- For stream/activity quests, join a voice channel (and have another user present for stream).
- Clicking again shows a progress toast:
	- That’s by design—only one run at a time. Wait for it to finish or watch progress via toasts.

## Development Notes 🧑‍💻

- The source is organized by “modules” using comment headers: Toast, Utils, Store Helpers, Video, Play, Stream, Activity, Runner, UI, State, Icons, Auto.
- Auto-complete is event-driven with a small debounce; there is no aggressive polling loop.
- The button’s icon is reactive through a tiny pub-sub to force re-renders on state changes.

## Credits 🙌

- Based on the original console script “CompleteDiscordQuests” by `amia` (all credits to the original author). This plugin adapts it to Vencord with UI/UX improvements and code refactoring.
- Adapted for Vencord by `Aqualunem`.

## License 📄

GPL-3.0-or-later (same as Vencord). See the header in the source file for details.


