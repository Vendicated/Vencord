# WebRPC

Adds Discord RPC support to the browser extension and to Vesktop.

## Web browser

The web extension uses the WebRPC companion, a native messaging host that:

- Runs a Discord RPC IPC server.
- Sends detected games to Discord.
- Starts automatically while a Discord tab is open.

Setup:

1. Download the companion from the [releases page](https://github.com/ThaUnknown/webrpc-companion/releases/latest) and run it once.
2. Enable the plugin and restart Discord.

The plugin is disabled by default on the web.

## Vesktop

On Vesktop the plugin runs the RPC bridge in the renderer. It connects Discord's RPC server to the Vesktop main process and feeds detected games into Discord.

The plugin is enabled by default on Vesktop. No companion is needed.

## Notes

- Discord's **Activity Sharing** setting controls whether detected games are shown.
- The web companion supports the IPC transport only. Browser-based RPC clients that use WebSocket do not work.
- The plugin is available on the browser extension and Vesktop, but not on the userscript build.
- `arRPC` is a separate plugin and uses a different transport.
