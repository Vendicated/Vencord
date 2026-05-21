# ModularCollapse for Vencord

> Ported from the [BetterDiscord CollapsibleUI plugin](https://github.com/programmer2514/BetterDiscord-CollapsibleUI) by programmer2514 (v12.3.4)

A feature-rich plugin that reworks the Discord UI to be significantly more modular.
Collapse, resize, and float UI panels like the server list, channel list, members list, user profile, and more.

## Features

- **Collapse** any UI panel (server list, channel list, members, user area, toolbar, etc.)
- **Resize** panels by dragging their edges
- **Float** panels so they overlay the chat area
- **Expand on hover** — collapsed panels can expand when you hover over them
- **Keyboard shortcuts** for quick toggling
- **Conditional collapse** — auto-collapse panels based on custom conditions
- **Size-based collapse** — auto-collapse when the window is too small

## Installation

### Prerequisites

- [Vencord](https://github.com/Vendicated/Vencord) installed from source (not the installer)

### Steps

```bash
# 1. Clone this repo into your Vencord userplugins folder
cd /path/to/Vencord/src/userplugins
git clone https://github.com/Fantasttic/modularCollapse-vencord.git modularCollapse

# 2. Build Vencord
cd /path/to/Vencord
pnpm build

# 3. Inject into Discord
pnpm inject
```

4. Restart Discord
5. Go to **Settings → Vencord → Plugins** and enable **ModularCollapse**

### Updating

```bash
cd /path/to/Vencord/src/userplugins/modularCollapse
git pull
cd /path/to/Vencord
pnpm build
```

Then restart Discord.

## Usage

Once enabled, collapse buttons appear in the Discord toolbar (top-right).
Click them to toggle each UI panel. You can also:

- **Right-click** a panel edge to reset its width
- **Drag** panel edges to resize them
- Configure expand-on-hover, floating panels, and keyboard shortcuts in the plugin settings

## Credits

- **programmer2514** — Original [BetterDiscord CollapsibleUI](https://github.com/programmer2514/BetterDiscord-CollapsibleUI) plugin
- Adapted for Vencord's plugin API with modern Discord CSS module support

## License

This project follows the same license as the original CollapsibleUI plugin.
