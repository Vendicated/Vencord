# Wakatime Plugin for Vencord

A simplified Wakatime integration plugin for Vencord that tracks your Discord usage time.

## Features

- **Simple Time Tracking**: Automatically tracks time spent using Discord
- **Configurable Heartbeat Interval**: Customize how often heartbeats are sent (30-600 seconds)
- **Activity Detection**: Only tracks when window is focused and user is active
- **Debug Logging**: Optional debug logs for troubleshooting
- **No Hostname Detection**: Simplified implementation without complex hostname detection

## Setup

1. Get your Wakatime API key from [https://wakatime.com/api-key](https://wakatime.com/api-key)
2. Enable the Wakatime plugin in Vencord settings
3. Enter your API key in the plugin settings
4. Start using Discord - your time will be automatically tracked!

## Settings

- **API Key**: Your Wakatime API key (starts with `waka_`)
- **Enable tracking**: Toggle to enable/disable time tracking
- **Heartbeat interval**: How often to send heartbeats to Wakatime (default: 120 seconds)
- **Show debug logs**: Enable console logging for debugging purposes

## Data Sent

The plugin sends minimal data to Wakatime:
- Entity: "Discord"
- Type: "app" 
- Editor: "Discord"
- Category: "communicating"
- Plugin identifier: "vencord wakatime/1.0.0"
- Timestamp

**No personal data, hostnames, or project information is sent.**

## Privacy

This plugin respects your privacy:
- Only tracks when Discord window is focused
- No hostname or machine identification
- No project names or personal information
- Only sends basic usage timestamps to Wakatime

## Troubleshooting

If you're having issues:

1. Verify your API key is correct and starts with `waka_`
2. Enable "Show debug logs" to see detailed logging in console
3. Check that tracking is enabled in settings
4. Ensure Discord window is focused (plugin only tracks when active)

## Contributing

This plugin is part of the Vencord project. For issues or improvements, please contribute to the main Vencord repository.
