# Equicord (Vencord+)

An enhanced version of [Vencord](https://github.com/Vendicated/Vencord) by [Vendicated](https://github.com/Vendicated) called Equicord

![image](https://i.ibb.co/xgNr2gq/image-2023-11-24-122019133.png)

## Features

-   Third-party plugins implemented into the main build.
-   100+ plugins built-in.
    -   Some highlights: SpotifyControls, MessageLogger, Experiments, GameActivityToggle, Translate, NoTrack, QuickReply, Free Emotes/Stickers, PermissionsViewer, 
        CustomCommands, ShowHiddenChannels, PronounDB
-   Fairly lightweight despite the many inbuilt plugins
-   Works on any Discord branch: Stable, Canary or PTB all work (though for the best experience, I recommend stable!)
-   Custom CSS and Themes: Inbuilt CSS editor with support to import any CSS files (including BetterDiscord themes)
-   Privacy friendly, blocks Discord analytics & crash reporting out of the box and has no telemetry
-   Maintained very actively, broken plugins are usually fixed within 12 hours
-   Able to update inside of Equicord through the update tab.
-   Same supporter badges as on Vencord (Don't lose your benefits)
-   Easy to install third-party plugins through the plugin page in Discord.
-   Request for plugins from Discord.


## Installing / Uninstalling

### Dependencies
[Git](https://git-scm.com/download) and [Node.JS LTS](https://nodejs.dev/en/) are required.

### Installing Equicord

Install `pnpm`:

> :exclamation: This next command may need to be run as admin/root depending on your system, and you may need to close and reopen your terminal for pnpm to be in your PATH.

```shell
npm i -g pnpm
```

> :exclamation: **IMPORTANT** Make sure you aren't using an admin/root terminal from here onwards. It **will** mess up your Discord/Equicord instance and you **will** most likely have to reinstall.

Clone Equicord:

```shell
git clone https://github.com/Equicord/Equicord
cd Equicord
```

Install dependencies:

```shell
pnpm install --frozen-lockfile
```

Build Equicord:

```shell
pnpm build
```
Inject Equicord into your client:

```shell
pnpm inject
```
After you have done this command, it will look like you are just installing Equicord but it will say it is a development build. If it doesn't say it is a development build, please reach out for support in the [Discord Server](https://discord.gg/5Xh2W87egW)

## Join our Support/Community Server

https://discord.gg/5Xh2W87egW

## Star History

<a href="https://star-history.com/#Equicord/Equicord&Timeline">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Equicord/Equicord&type=Timeline&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Equicord/Equicord&type=Timeline" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Equicord/Equicord&type=Timeline" />
  </picture>
</a>

## Disclaimer

Discord is trademark of Discord Inc. and solely mentioned for the sake of descriptivity.
Mentioning it does not imply any affiliation with or endorsement by Discord Inc.
Vencord is not connected to Equicord and as such, all donation links go to Vendicated's donation link.

<details>
<summary>Using Equicord (Vencord+) violates Discord's terms of service</summary>

Client modifications are against Discord’s Terms of Service.

However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods! So you should generally be fine if you don’t use plugins that implement abusive behaviour. But no worries, all inbuilt plugins are safe to use!

Regardless, if your account is essential to you and getting disabled would be a disaster for you, you should probably not use any client mods (not exclusive to Equicord), just to be safe

Additionally, make sure not to post screenshots with Equicord in a server where you might get banned for it

</details>

Plugins may take time to be added as I am not on all of the time because of school and stuff.
