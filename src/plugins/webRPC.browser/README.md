# WebRPC

Adds Discord RPC support to the browser. This plugin uses the Vencord WebRPC companion, a small native messaging host.

The companion:

* Runs a Discord RPC IPC server on your computer.
* Sends detected games to Discord.
* Starts automatically while a Discord tab is open.

## Setup

1. Download the companion app from the releases page.
2. Run the companion app once.
3. Enable the plugin and restart Discord.

The companion installs itself for Chromium browsers. Read [the companion documentation](../../../companion/README.md) for details.

## Notes

* Game detection follows Discord's **Activity Sharing** setting. Disable it to stop the companion from scanning for games.
* Only the IPC transport is supported. Browser-based RPC clients that use WebSocket do not work.
* The plugin is not available on the userscript build or on Firefox.
* `arRPC` is a separate plugin and uses a different transport.
