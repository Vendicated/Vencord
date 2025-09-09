Support for a client side proximity chat protocol I designed yesterday.

## Why?

There are previously no Discord-based proximity chat clients, so I might as well as write it.

I have read the code of conduct:
- Nothing similar to this existed for Discord
- This plugin has not been requested
- The plugin does not depend on any external APIs or bots.
- I'm not opening a request because I've already wrote the plugin, I'm here just to ask if Vencord would like to include it.
- I have checked that changing local volume 20 times a second will not spam Discord with API requests, setting update requests are only triggered by changes made by the user.

### Showcase

https://github.com/user-attachments/assets/fa02ff46-4a46-470b-a71d-e58ddadc79d5

### How this works

The main idea behind it is similar to ARRPC.
1. The game client (e.g. Minecraft) starts a websocket server at `ws://127.0.0.1:25560/api/subscriptions`
2. This plugin connects to the websocket server
3. This plugin sends the list of users in the VC to the game client.
4. The game client calculates the **volume multiplier**, and sends it back to the plugin.
5. The plugin updates the user volumes accordingly.

The plugin resets all use volumes to their original volumes when the game closes, or when the user leaves the VC.

### The protocol

Messages are JSON formatted
```json
{
	"t": "string",
	"c": "any"
}
```

Here are the message types that can be sent:

#### connected

WS server -> plugin when the connection is made

```json
{
  "t": "connected",
  "c": null
}
```

#### sub

Plugin -> WS server when you join a VC, or someone new joined a VC.

```json
{
  "t": "connected",
  "c": [ "12345678910", "list of discord ids..."]
}
```

