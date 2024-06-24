# Equicord

An enhanced version of [Vencord](https://github.com/Vendicated/Vencord) by [Vendicated](https://github.com/Vendicated) called Equicord.

![image](https://github.com/Equicord/Equicord/assets/78185467/81707ad9-3a04-4f76-88a0-60ee70684f81)

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

<details>
<summary>Extra included plugins (58 additional plugins)</summary>

- AllCallTimers by MaxHerbold and D3SOX
- AltKrispSwitch by newwares
- Anammox by Kyuuhachi
- BetterActivities by D3SOX, Arjix, AutumnVN
- BetterQuickReact by Ven and Sqaaakoi
- BlockKrsip by D3SOX
- BypassDND by Inbestigator
- CleanChannelName by AutumnVN
- CopyUserMention by Cortex and castdrian
- CustomAppIcons by Happy Enderman and SerStars
- DNDWhilePlaying by thororen
- DoNotLeak by Perny
- DoubleCounterBypass by nyx
- EmojiDumper by Cortex, Samwich, Woosh
- EquicordCSS by FoxStorm1 and thororen (and all respective css developers)
- ExportContacts by dat_insanity
- FindReply by newwares
- FriendshipRanks by Samwich
- GlobalBadges by HypedDomi and Hosted by Wolfie
- GodMode by Tolgchu
- HideMessage by Hanzy
- HolyNotes by Wolfie
- Hop On by ImLvna
- IgnoreTerms by D3SOX
- IRememberYou by zoodogood
- Keyboard Sounds by HypedDomi
- KeywordNotify by camila314
- Meow by Samwich
- MessageLinkTooltip by Kyuuhachi
- MessageLoggerEnhanced (MLEnhanced) by Aria
- noAppsAllowed by kvba
- NoModalAnimation by AutumnVN
- NoNitroUpsell by thororen
- NotifyUserChanges by D3SOX
- OnePingPerDM by ProffDea
- PlatformSpoofer by Drag
- PurgeMessages by bhop and nyx
- QuestionMarkReplacement (QuestionMarkReplace) by nyx
- Quoter by Samwich
- RepeatMessage by Tolgchu
- ReplyPingControl by ant0n and MrDiamond
- ScreenRecorder by AutumnVN
- Search by JacobTm and thororen
- SearchFix by Jaxx
- Sekai Stickers by MaiKokain
- ShowBadgesInChat by Inbestigator and KrystalSkull
- Slap by Korbo
- SoundBoardLogger by Moxxie, fres, echo, thororen
- TalkInReverse by Tolgchu
- ThemeLibrary by Fafa
- UnlimitedAccounts by Balaclava and thororen
- UserPFP by nexpid and thororen
- VCSupport by thororen
- VencordRPC by AutumnVN
- VoiceChatUtilities by Dams and D3SOX
- WhosWatching by fres
- Woof by Samwich
- YoutubeDescription by arHSM

</details>


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

## Credits

Thank you to [Suncord](https://github.com/verticalsync/Suncord) by [VerticalSync](https://github.com/verticalsync) for helping me when needed.

Thank you to [Vendicated](https://github.com/Vendicated) for creating [Vencord](https://github.com/Vendicated/Vencord).

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
<summary>Using Equicord violates Discord's terms of service</summary>

Client modifications are against Discord’s Terms of Service.

However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods! So you should generally be fine if you don’t use plugins that implement abusive behaviour. But no worries, all inbuilt plugins are safe to use!

Regardless, if your account is essential to you and getting disabled would be a disaster for you, you should probably not use any client mods (not exclusive to Equicord), just to be safe

Additionally, make sure not to post screenshots with Equicord in a server where you might get banned for it

</details>
