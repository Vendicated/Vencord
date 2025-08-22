# Questify

Enhance your Quest experience with a suite of features, or disable them entirely if they're not your thing.

![An example of the Restyle and Reorder features.](https://github.com/user-attachments/assets/452ba894-d0e0-46d5-894a-af901c42d8e5)

## Features
1. Quest Features
    - Modify specific Quest features.
    - Allows for disabling the following Quest related features:
        - Everything — All of the below is disabled.
        - Discovery Tab — Quests tab becomes hidden.
        - Fetching Quests — Will prevent fetching Quests resulting in a blank Quests page.
        - Badge on User Profiles — Hides the profile badge which doubles as a shortcut to the Quests page.
        - Popup Above User Panel — Hides the new Quest promotion that appears above your profile panel.
        - Gift Inventory Relocation Notice — Hides the text in the gift inventory which doubles as a shortcut to the Quests page.
        - Friends List Active Now Promotion — Hides the promotion that displays when your friends play a game which has an active Quest.
    - Allows for modifying the following Quest related features:
        - Complete Video Quests in Background — Click the watch button on video Quests and wait for the video duration to pass. The first click will start the Quest without opening the video modal. Subsequent clicks will show the modal as normal.
        - Complete Game Quests in Background — Click the accept button on game Quests and wait for the play duration to pass.
        - Make Mobile Quests Desktop Compatible — Make mobile-only video Quests completable on Desktop.
2. Quests Button
    - Show a Quest button in the server list with an optional indicator for unclaimed Quests.
    - Button Visibility
        - Always — Always display the button.
        - Unclaimed — Only display the button when you have unclaimed Quests.
        - Never — Never display the button.
    - Unclaimed Indicator
        - Pill — Shows an "unread" pill when there are unclaimed Quests.
        - Badge — Shows the number of unclaimed Quests as a "ping" badge.
        - Both — Both of the above.
        - None — Show no indication of unclaimed Quests.
    - Badge Color
        - Use the color picker to pick a custom badge color or use the default Discord ping badge color by clicking `Disable`.
    - Left / Middle / Right Click Actions
        - Open Quests — Navigate to the Quests tab in Discovery.
        - Plugin Settings — Open the plugin settings.
        - Context Menu — Show the options `Mark All Ignored`, `Reset Ignored List`, and `Fetch Quests`.
        - Nothing — Do nothing.
3. Fetching Quests
    - Configure how often to fetch Quests from Discord and set up alerts for new Quests.
    - By default, Discord only fetches Quests on load and when visiting the Quests page. This means that without a fetch interval defined below, this plugin will become unaware of new Quests added throughout the day.
    - This relies on the Quest Button being enabled and set to either `Unclaimed`, or set to `Always` with unclaimed `Pill`, `Badge`, or `Both` indicators enabled. Otherwise, there is no reason to periodically fetch Quests.
    - Also, if `Fetching Quests` is blocked in the `Quest Features` setting, this will not work.
    - Fetch Interval
        - Any time between 30 minutes and 12 hours. Defaults to every 45 minutes.
    - Alert Sound
        - Pick a default Discord sound to play when new Quests are fetched, or provide a custom audio URL. The audio must be hosted on a domain whitelisted by the Vencord CSP, such as `catbox`.
        - If the provided URL is not on a supported domain, you will receive an error. If it *is* on a supported domain, but the audio file is invalid, it will silently fail. To ensure your audio file plays fine, click the audio preview button in the plugin settings.
4. Restyle Quests
    - Highlight Quests with optional theme colors for visibility.
    - Unclaimed / Claimed / Ignored / Expired
        - Use the color picker to pick a custom Quest tile color or use the default Discord coloring by clicking `Disable`.
    - Gradient Style
        - Intense Restyle Gradient — A more intense gradient than default in order to hide hard edges under the gradient.
        - Default Restyle Gradient — The default gradient intensity with the restyle color.
        - Subtle Black Gradient — A much less intense black gradient for contrast with the Quest assets.
        - No Gradient — Remove the gradient altogether. May cause the Quest assets to be difficult to see.
    - Asset Preload
        - Load All Quest Assets On Page Load — As soon as the Quest page is opened, load all Quest assets on the page.
        - Load Quest Assets During Page Scroll — Keep the default behavior of loading Quest assets as they come into view.
5. Reorder Quests
    - Sort Quests by their status.
    - Comma-separated list must contain all of: `UNCLAIMED, CLAIMED, IGNORED, EXPIRED`.
    - Subsort status groups by Quest added date, expiring date, or claimed date.
    - Ignored Quest Profile
        - Share ignored quests between accounts on a single client or keep them separate.
        - Ignore Quests by opening their context menu and selecting `Mark as Ignored`.