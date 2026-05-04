# 7TV Emotes

Adds a dedicated 7TV tab to Discord's expression picker, allowing you to browse and use 7TV emotes directly from the emote picker alongside GIFs and stickers.

## Features

- **7TV Tab Integration**: New tab in the expression picker with a dedicated 7TV interface
- **Favorites System**: Mark your frequently used emotes as favorites for quick access
- **Channel Management**: Add 7TV channels to browse their emote collections
- **Global Search**: Search across all 7TV emotes globally
- **Priority Search**: Smart search that prioritizes favorites → configured channels → global emotes
- **Auto-Expansion**: Use `:+emotename:` syntax to automatically expand to a 7TV emote URL in messages
- **Responsive UI**: Clean sidebar with channel navigation and search filtering

## Preview

The plugin integrates seamlessly into Discord's expression picker with a dedicated 7TV tab:

- **Left Sidebar**: Channel navigation with avatars (favorites tab + your configured channels)
- **Main Area**: 64px emote grid with search and filtering
- **Star Indicator**: Gold star (★) marks your favorite emotes for quick identification

## Usage

### Adding 7TV Channels

1. Open Discord settings
2. Navigate to **Plugins** → **7TVEmotes**
3. In the **Channels Manager** section, enter a 7TV username or channel ID
4. The channel's avatar will load automatically
5. Click the ➕ button to add the channel

### Using Emotes

**Via Expression Picker:**

1. Open the expression picker (usually next to emoji/GIF buttons)
2. Click the **7TV** tab
3. Browse channels from the left sidebar or search for emotes
4. Click an emote to insert it into your message
5. Right-click or Ctrl/Cmd-click any emote to add/remove it from favorites

**Via Quick Expansion:**
Type `:+emotename:` in a message to automatically expand it to a 7TV emote URL. The plugin searches in this order:

1. Your favorite emotes (highest priority)
2. Channels you've configured
3. Global 7TV emotes

**Favorites Tab:**

- Click the ⭐ button in the sidebar to view all your favorited emotes
- Easily insert frequently used emotes without searching

### First-Time Setup

On first use, you may see a CSP permission request. Discord will ask for permission to access 7TV APIs:

- **API Access**: `https://7tv.io` (for emote data and user lookups)
- **CDN Access**: `https://cdn.7tv.app` (for emote images)

Accept the permissions and restart Discord for the plugin to work fully.

## Configuration

**Channels**: Comma-separated list of 7TV usernames or channel IDs to include in your browser

Example: `username1, userid123, another_user`
