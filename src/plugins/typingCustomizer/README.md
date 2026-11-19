# TypingCustomizer

Replaces Discord's typing indicator with your own text and emoji.

- The three dots become up to three emoji, one per dot, with a small wave animation.
- The "{name} is typing…" text becomes your template, `{user}` being replaced by the display name.
- Both only apply while you are the only one typing, exactly like Discord's own custom indicator.

## Setting your indicator

Run `/set text:{user} is overthinking… emojis:👀💭✨` with the bot, and `/reset` to go back to the default. The bot
stores the indicator of the account that ran the command and serves it as `<baseUrl>/<userId>.json`, which the
plugin reads. Everyone who has the plugin sees it, in every server.

The bot lives in [`bot/`](./bot/README.md). It is a small Discord bot (discord.js) exposing the stored indicators
over HTTP, meant to run behind a reverse proxy.

## Self hosting

The default base URL points to the instance hosted by the plugin's author. To use your own:

1. Follow [`bot/README.md`](./bot/README.md) to run the bot and expose it over HTTPS.
2. Set the plugin's base URL setting to your domain.
3. Add that domain to the `CspPolicies` map in `src/main/csp/index.ts` (desktop only, the browser extension does not
   restrict `connect-src`), then rebuild.

Setting an indicator is entirely done through the bot: the plugin never writes anything, and the bot only accepts
commands from the account whose indicator is being changed.
