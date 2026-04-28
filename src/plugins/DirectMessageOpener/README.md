# DirectMessageOpener

A plugin for [Equicord](https://github.com/Equicord/Equicord) that allows you to open a direct message (DM) with any Discord user by simply entering their User ID.

## Features

- **Toolbar Button**: Click the user icon in the top-right toolbar to open a popup
- **User ID Input**: Enter any Discord User ID to instantly open a DM
- **Slash Command**: Use `/opendm` command as an alternative method
- **Smart Error Handling**: Clear error messages for blocked users, invalid IDs, and system accounts
- **Smooth Animations**: Icon with hover effects matching Discord's design

## Usage

### Method 1: Toolbar Button
1. Click the user icon in the top-right toolbar
2. Enter the Discord User ID in the popup
3. Click "Open DM"

### Method 2: Slash Command
/opendm userid:123456789012345678

## Finding User IDs

To find a user's ID:
1. Enable Developer Mode in Discord Settings > Advanced > Developer Mode
2. Right-click on any user and select "Copy User ID"

## Error Messages

The plugin provides helpful error messages for different scenarios:

- **50007**: User has blocked you or is a bot/system/webhook account
- **50033**: Invalid recipient (system account, deleted user, or invalid ID)
- **50035**: Invalid User ID format (must be numeric, 17-19 digits)

## How It Works

The plugin uses Discord's internal REST API endpoint `/users/@me/channels` to create a DM channel with the specified user. It then automatically navigates to that channel, allowing you to message users even if you don't share any servers with them.

---

**Author**: Mifu | **License**: GPL-3.0