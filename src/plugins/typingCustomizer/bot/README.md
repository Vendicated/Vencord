# TypingCustomizer bot

Serves the custom typing indicators of the TypingCustomizer plugin.

- `/set text:… emojis:…` stores the indicator of the account that ran the command.
- `/reset` (optionally `part:text` or `part:emojis`) removes it.
- `GET /<userId>.json` returns it, `404` when the user has none.

The bot only ever writes the config of the user invoking the command, so an indicator cannot be set for someone else.

## Setup

```sh
pnpm install
```

Create an application on the Discord developer portal, add a bot to it, then invite it with the `applications.commands` scope.

```sh
cp .env.example .env
$EDITOR .env
pnpm start
```

The `.env` file is read from the working directory, so start the bot from this folder.

Environment variables:

| Variable       | Default        | Description                                      |
| -------------- | -------------- | ------------------------------------------------ |
| `DISCORD_TOKEN`| required       | Bot token                                        |
| `GUILD_ID`     | none           | Register the commands in this guild              |
| `PORT`         | `6523`         | HTTP port, bound to `127.0.0.1`                   |
| `DATA_DIR`     | `./data`       | Where the `<userId>.json` files are written      |

## systemd

The service has to run in this folder so `.env` is picked up:

```ini
[Service]
WorkingDirectory=/srv/typing-customizer-bot
ExecStart=/usr/bin/node index.js
Restart=always
```

## Reverse proxy

The HTTP server only listens on loopback, so the public domain has to forward to it:

```nginx
location / {
    proxy_pass http://127.0.0.1:6523;
    proxy_set_header Host $host;
}
```

The plugin's default base URL is `https://custom-typing.rocknite-studio.com`. The domain also needs to be in the
`CspPolicies` allowlist of Vencord (`src/main/csp/index.ts`) for the desktop app to fetch it; it already is for this
domain, add yours if you host another instance.
