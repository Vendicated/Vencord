# JunkCleanup

Another plugin that cleans up common annoyances in Discord

Does not inject styles, uses Vencord patches

## Installation

### See https://docs.vencord.dev/installing/custom-plugins/ for setting up custom plugins
Once you have setup the environment for custom plugins, clone into the `src/userplugins` folder.

> [!WARNING]
> Do not ask for support regarding installation, including in Vencord's support channel, my DMs, repository issues, or anywhere this plugin has been published, as you won't recieve help. Follow the guide linked above.

## Removed Junk

- Chatbox buttons
  - Gift button
  - GIFs button (disabled by default)
  - Stickers button (disabled by default)
- Nitro and Shop pages in DMs
- Profile editor shop upsell banner
- Update Ready! button (disabled by default)
- Settings pages / sidebar buttons
  - Family Center
  - Merchandise
  - Social Media links
  - Payment section (disabled by default, as it can be opened other places in the app, and hiding it will cause a blank screen)
- Activity Feed in members list (disabled by default)
- Active Now sidebar (disabled by default)
- Transfer voice to console
- Activity name above expanded activities in text channels
- Invite to Server in context menus
- Clipping enabled voice recording warning
- Sidebar channel buttons
  - Create Invite
  - Edit Channel (disabled by default)
- Server Boost progress bar
- New member badge (disabled by default)
- Quests
  - Quest promotions in the sidebar
  - Quest promotions in the Active Now sidebar
- Support link in top toolbar (disabled by default)
- DM Sidebar Quick Switcher button (disabled by default)

## Coming soon

- Quest promotions in other places
- Floating nitro upsell in profiles

## Contributing / Adding your own patch

Patches are not located in the plugin object. Patches are instead defined a special wrapper object within the `Patches` object in [patches.ts](./patches.ts). See the types and comments for more details.

These wrapper objects are parsed in [index.ts](./index.ts) to provide settings + associated enabled predicate for each patch.

## Credits

Concept and some features inspired by [Anammox](https://github.com/Kyuuhachi/VencordPlugins/tree/main/Anammox)
