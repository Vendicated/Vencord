# Vencord

A Discord client mod that does things differently

## Features

- Works on Discord's latest update that breaks all other mods
- Browser Support (experimental): Run Vencord in your Browser instead of the desktop app
- Custom Css and Themes: Manually edit `%appdata%/Vencord/settings/quickCss.css` / `~/.config/Vencord/settings/quickCss.css` with your favourite editor and the client will automatically apply your changes. To import BetterDiscord themes, just add `@import url(theUrl)` on the top of this file. (Make sure the url is a github raw URL or similar and only contains plain text, and NOT a nice looking website)
- Many Useful™ plugins - [List](https://github.com/Vendicated/Vencord/tree/main/src/plugins)
- Experiments
- Proper context isolation -> Works in newer Electron versions (Confirmed working on versions 13-21)
- Inline patches: Patch Discord's code with regex replacements! See [the experiments plugin](src/plugins/experiments.ts) for an example. While being more complex, this is more powerful than monkey patching since you can patch only small parts of functions instead of fully replacing them, access non exported/local variables and even replace constants (like in the aforementioned experiments patch!)


## Installing

If you can't follow the following instructions, please just use BetterDiscord. This was never meant to be a noob friendly mod.

Install [Node.js](https://nodejs.org/en/download/) and [git](https://git-scm.com/downloads)

Open a Terminal and run the following commands. If any of them failed, you didn't properly install Node.js and git (see above).
> :warning: On Windows, DO NOT run the terminal as Administrator. If you open it and the path says system32, you opened it as Administrator.

```sh
npm i -g pnpm
git clone https://github.com/Vendicated/Vencord
cd Vencord
pnpm i
pnpm build
```
Don't close your terminal just yet!

The builds are now in the dist/ folder (Vencord/dist). Most importantly, you will need `dist/patcher.js`

Now download [X1nto's installer](https://github.com/X1nto/VencordInstaller/releases/latest) for your platform. Download it to the Vencord folder.
Run it via terminal: `VencordInstaller.exe` on Windows or `chmod +x vencord_installer && ./vencord_installer` on Mac.

Follow along with the prompts. Once you are prompted for the patcher, enter `dist/patcher.js`.

Now fully close Discord. Start and confirm Vencord successfully installed by checking if you have a new Vencord section in Settings.

If you ever need to get back to the Vencord folder, just open a new terminal and type `cd Vencord`

All plugins are disabled by default, so your first step should be opening Settings and enabling the plugins you want.


## Installing on Browser

Run the same commands as in the regular install method. Now run
```sh
pnpm buildWeb
```
You will find the built extension at dist/extension.zip. Now just install this extension in your Browser

## Contributing
[contribute]: CONTRIBUTING.md

[contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute]   

## Join
[join]: https://discord.gg/D9uwnFnqmd

[join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join]
