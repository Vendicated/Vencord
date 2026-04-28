# HypeSquad Switcher[Badge Claimer]

A Vencord plugin that allows you to easily switch between Discord HypeSquad houses. Add or remove your badge entirely.(Those who dont have hypesquad badge can get that)
I don't know if this make your account limited
## ✨ Features

- 🏠 Switch between all three HypeSquad houses (Bravery, Brilliance, Balance)
- 🗑️ Remove your HypeSquad badge completely
- ⚡ Instant switching via slash command
- ⚙️ Optional settings panel for easy access (settings version)
- ✅ Confirmation messages for every action

## 📸 Preview

Use the `/hypesquad` command to quickly change your house:

```
/hypesquad house:1  → House Bravery
/hypesquad house:2  → House Brilliance
/hypesquad house:3  → House Balance
/hypesquad house:0  → Remove Badge
```

## 📦 Installation

### Prerequisites

- [Vencord](https://vencord.dev/) installed and working.

### Steps

1. **Download the plugin**
   - Download `index.tsx` from this repository
     
2. **Locate your Vencord userplugins folder**
   - **Windows:** `%appdata%/Vencord/userplugins/`
   - **macOS:** `~/Library/Application Support/Vencord/userplugins/`
   - **Linux:** `~/.config/Vencord/userplugins/`

3. **Create plugin folder**
   - Create a new folder named `HypeSquadSwitcher` inside the userplugins directory

4. **Add the plugin file**
   - Place the downloaded file inside the `HypeSquadSwitcher` folder
   - Rename it to `index.tsx` (if you downloaded the settings version)

5. **Restart Discord**
   - Fully close and reopen Discord
   - Or reload using `Ctrl+R` (Windows/Linux) or `Cmd+R` (macOS)

6. **Enable the plugin**
   - Go to User Settings → Vencord → Plugins
   - Find "HypeSquadSwitcher" and toggle it on

## 🎯 Usage

### Using the Command

Type `/hypesquad` in any Discord text channel or DM, then select your desired house:

| Option | House |
|--------|-------|
| `0` | Remove Badge |
| `1` | House Bravery |
| `2` | House Brilliance |
| `3` | House Balance |

### Using Settings Panel 

1. Go to **User Settings** → **Vencord** → **Plugins**
2. Find **HypeSquadSwitcher** in the list
3. Click the **⚙️ settings icon**
4. Select your house from the dropdown menu

Changes apply instantly!
## 📁 File Structure

```
HypeSquadSwitcher/
└── index.tsx          # Main plugin file
```


## ⚠️ Troubleshooting

### Plugin doesn't appear in Vencord settings
- Make sure the file is named exactly `index.tsx`
- Verify the file is in the correct folder: `userplugins/HypeSquadSwitcher/index.tsx`
- Restart Discord completely

### Command doesn't work
- Ensure the plugin is enabled in Vencord settings
- Try typing `/` to see if the command appears in the autocomplete

### "Request failed" error
- This usually means Discord's API rejected the request
- Wait a few seconds and try again
- Make sure you have a stable internet connection

### Badge doesn't update immediately
- Discord may take a few seconds to update your profile
- Try refreshing Discord (`Ctrl+R` or `Cmd+R`)
- Check your profile to confirm the change

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests

## 📝 License

This plugin is licensed under the **GPL-3.0** license to comply with Vencord's licensing.

## ⚡ Credits

- Original Vendetta plugin concept
- Ported to Vencord by [Dipraj]

## 🔗 Links

- [Vencord](https://vencord.dev/)
- [Discord Developer Portal](https://discord.com/developers/docs/intro)

## ⚖️ Disclaimer

This plugin uses Discord's official API endpoints. Use at your own discretion. The authors are not responsible for any issues that may arise from using this plugin.

---

**Enjoy your new HypeSquad house! 🎉**

If you find this plugin useful, consider giving it a ⭐ on GitHub!
