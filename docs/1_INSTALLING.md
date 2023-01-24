> **Warning**
> These instructions are only for advanced users. If you're not a Developer, you should use our [graphical installer](https://github.com/Vendicated/VencordInstaller#usage) instead.

# Installation Guide

Welcome to Megu's Installation Guide! In this file, you will learn about how to download, install, and uninstall Vencord!

## Sections

- [Installation Guide](#installation-guide)
  - [Sections](#sections)
  - [Dependencies](#dependencies)
  - [Installing Vencord](#installing-vencord)
  - [Updating Vencord](#updating-vencord)
  - [Uninstalling Vencord](#uninstalling-vencord)
  - [Manually Installing Vencord](#manually-installing-vencord)
    - [On Windows](#on-windows)
    - [On Linux](#on-linux)
    - [On MacOS](#on-macos)
    - [Manual Patching](#manual-patching)
    - [Manually Uninstalling Vencord](#manually-uninstalling-vencord)

## Dependencies

-   Install Git from https://git-scm.com/download
-   Install Node.JS LTS from here: https://nodejs.dev/en/

## Installing Vencord

> :exclamation: If this doesn't work, see [Manually Installing Vencord](#manually-installing-vencord)

Install `pnpm`:

> :exclamation: this may need to be run as admin depending on your system, and you may need to close and reopen your terminal.

```shell
npm i -g pnpm
```

Clone Vencord:

```shell
git clone https://github.com/Vendicated/Vencord
cd Vencord
```

Install dependencies:

```shell
pnpm install --frozen-lockfile
```

Build Vencord:

```shell
pnpm build
```

Inject vencord into your client:

```shell
pnpm inject
```

Then fully close Discord from your taskbar or task manager, and restart it. Vencord should be injected - you can check this by looking for the Vencord section in Discord settings.

## Updating Vencord

If you're using Discord already, go into the `Updater` tab in settings.

Sometimes it may be neccessary to manually update if the GUI updater fails.

To pull latest changes:

```shell
git pull
```

If this fails, you likely need to reset your local changes to vencord to resolve merge errors:

> :exclamation: This command will remove any local changes you've made to vencord. Make sure you back up if you made any code changes you don't want to lose!

```shell
git reset --hard
git pull
```

and then to build the changes:

```shell
pnpm build
```

Then just refresh your client

## Uninstalling Vencord

Simply run:

```shell
pnpm uninject
```

The above command may ask you to also run:

```shell
pnpm install --frozen-lockfile
pnpm uninject
```

## Manually Installing Vencord

-   [Windows](#on-windows)
-   [Linux](#on-linux)
-   [MacOS](#on-macos)

### On Windows

Press Win+R and enter: `%LocalAppData%` and hit enter. In this page, find the page (Discord, DiscordPTB, DiscordCanary, etc) that you want to patch.

Now follow the instructions at [Manual Patching](#manual-patching)

### On Linux

The Discord folder is usually in one of the following paths:

-   /usr/share
-   /usr/lib64
-   /opt
-   /home/$USER/.local/share

If you use flatpak, it will usually be in one of the following paths:

-   /var/lib/flatpak/app/com.discordapp.Discord/current/active/files
-   /home/$USER/.local/share/flatpak/app/com.discordapp.Discord/current/active/files

You will need to give flatpak access to vencord with one of the following commands:

> :exclamation: If not on stable, replace `com.discordapp.Discord` with your branch name, e.g., `com.discordapp.DiscordCanary`

> :exclamation: Replace `/path/to/vencord/` with the path to your vencord folder (NOT the dist folder)

If Discord flatpak install is in /home/:

```shell
flatpak override --user com.discordapp.Discord --filesystem="/path/to/vencord/"
```

If Discord flatpak install not in /home/:

```shell
sudo flatpak override com.discordapp.Discord --filesystem="/path/to/vencord"
```

Now follow the instructions at [Manual Patching](#manual-patching)

### On MacOS

Open finder and go to your Applications folder. Right-Click on the Discord application you want to patch, and view contents.

Go to the `Contents/Resources` folder.

Now follow the instructions at [Manual Patching](#manual-patching)

### Manual Patching

> :exclamation: If using Flatpak on linux, go to the folder that contains the `app.asar` file, and skip to where we create the `app` folder below.

> :exclamation: On Linux/MacOS, there's a chance there won't be an `app-<number>` folder, but there probably is a `resources` folder, so keep reading :)

Inside there, look for the `app-<number>` folders. If you have multiple, use the highest number. If that doesn't work, do it for the rest of the `app-<number>` folders.

Inside there, go to the `resources` folder. There should be a file called `app.asar`. If there isn't, look at a different `app-<number>` folder instead.

Make a new folder in `resources` called `app`. In here, we will make two files:

`package.json` and `index.js`

In `index.js`:

> :exclamation: Replace the path in the first line with the path to `patcher.js` in your vencord dist folder.
> On Windows, you can get this by shift-rightclicking the patcher.js file and selecting "copy as path"

```js
require("C:/Users/<your user>/path/to/vencord/dist/patcher.js");
```

And in `package.json`:

```json
{ "name": "discord", "main": "index.js" }
```

Finally, fully close & reopen your Discord client and check to see that `Vencord` appears in settings!

### Manually Uninstalling Vencord

> :exclamation: Do not delete `app.asar` - Only delete the `app` folder we created.

Use the instructions above to find the `app` folder, and delete it. Then Close & Reopen Discord.

If you need more help, ask in the support channel in our [Discord Server](https://discord.gg/D9uwnFnqmd).
