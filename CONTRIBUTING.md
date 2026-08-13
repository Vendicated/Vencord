# Contributing to Vencord

> [!NOTE]
> **AI Usage Notice**
>
> Your contribution must be majority human written! Some AI assistance like inline suggestions is acceptable, but "vibecoded" contributions are not welcome.
> Also **do not** use AI to generate your pull request description, README.md or in communication. Ignoring this rule will lead to a permanent block.

Vencord is a community project and welcomes any kind of contribution from anyone!

We have development documentation for new contributors, which can be found at <https://docs.vencord.dev>.

All contributions should be made in accordance with our [Code of Conduct](./CODE_OF_CONDUCT.md).

## How to contribute

Contributions can be sent via pull requests. If you're new to Git, check [this guide](https://opensource.com/article/19/7/create-pull-request-github).

Pull requests can be made either to the `main` or the `dev` branch. However, unless you're an advanced user, I recommend sticking to `main`.
This is because the dev branch might contain unstable changes and be force pushed frequently, which could cause conflicts in your pull request.

Before working on a major change, I highly recommend opening a feature request for it, making sure to check "I am willing to work on this myself",
so we can discuss before you invest time. Alternatively, you can also do so in our Discord server's development
channels. This saves you a lot of time in case your feature is considered too niche or rejected for any other reason.

## Write a plugin

Writing a plugin is the primary way to contribute.

Before starting your plugin:
- Consider if this plugin would be useful to a large portion of the userbase. We do not accept niche plugins
- Check existing pull requests to see if someone is already working on a similar plugin
- Familarise yourself with our plugin rules below to ensure your plugin is not banned

### Plugin Rules

- No simple slash command plugins like `/cat`. Instead, make a [user installable Discord bot](https://discord.com/developers/docs/change-log#userinstallable-apps-preview)
- No simple text replace plugins like Let me Google that for you. The TextReplace plugin can do this
- No raw DOM manipulation. Use proper patches and React
- No FakeDeafen or FakeMute
- No StereoMic
- No plugins that simply hide or redesign ui elements. This can be done with CSS
- No plugins that interact with specific Discord bots (official Discord apps like Youtube WatchTogether are okay)
- No selfbots or API spam (animated status, message pruner, auto reply, nitro snipers, etc)
- No untrusted third party APIs. Popular services like Google or GitHub are fine, but absolutely no self hosted ones
- No plugins that require the user to enter their own API key
- Do not introduce new dependencies unless absolutely necessary and warranted

## Improve Vencord itself

If you have any ideas on how to improve Vencord itself, or want to propose a new plugin API, feel free to open a feature request so we can discuss.

Or if you notice any bugs or typos, feel free to fix them!

## Contribute to our Documentation

The source code of our documentation is available at <https://github.com/Vencord/Docs>

If you see anything outdated, incorrect or lacking, please fix it!
If you think a new page should be added, feel free to suggest it via an issue and we can discuss.

## Help out users in our Discord community

We have an open support channel in our [Discord community](https://vencord.dev/discord).
Helping out users there is always appreciated! The more, the merrier.
