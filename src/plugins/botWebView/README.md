# Bot WebView

Adds a button in Discord that opens an external bot dashboard
inside a dedicated browser window styled like Discord.

## Features

- Adds a button to the account panel
- Opens the bot dashboard in a separate window (BrowserWindow)
- Configurable dashboard URL
- No embedded iframe
- No credentials injection

## Configuration

Go to:
**Settings → Vencord → Plugins → Bot WebView**

Set:

- **Dashboard URL**
  Example: https://bot.example.com/login

## Security

This plugin does not read, inject, or store credentials.
Authentication is fully handled by the external dashboard.

## Notes

The dashboard is opened in a native browser window, not embedded in Discord.
This avoids CSP, iframe, and X-Frame-Options limitations.

## Author

Mavaki
